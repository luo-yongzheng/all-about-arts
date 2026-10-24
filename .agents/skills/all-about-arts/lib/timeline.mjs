// The common clock for pictures, narration, event sounds, and subtitle cues.
// No recognition is performed here: every generated word states its precision.
const PRECISIONS = new Set(['estimated', 'interpolated', 'recognized']);
const finite = (n) => typeof n === 'number' && Number.isFinite(n);
const cleanWord = (s) => String(s).toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]/gu, '');

function tokens(text) {
  if (typeof text !== 'string' || !text.trim()) return [];
  if (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(text)) {
    return [...new Intl.Segmenter('und', { granularity: 'word' }).segment(text)]
      .filter((x) => x.isWordLike).map((x) => x.segment);
  }
  return text.trim().split(/\s+/u);
}

function spread(text, start, end, precision) {
  const parts = tokens(text);
  const weights = parts.map((s) => Math.max(1, [...s].length));
  const sum = weights.reduce((a, b) => a + b, 0);
  let cursor = start;
  return parts.map((text, i) => {
    const next = i === parts.length - 1 ? end : cursor + (end - start) * weights[i] / sum;
    const word = { text, start: cursor, end: next, precision };
    cursor = next;
    return word;
  });
}

function validateWords(words, duration, fallback) {
  if (!Array.isArray(words)) throw new Error('Narration words must be an array');
  let previous = -1;
  return words.map((word, index) => {
    if (!word || typeof (word.text ?? word.word) !== 'string' || !(word.text ?? word.word).trim()
      || !finite(word.start) || !finite(word.end) || word.start < 0 || word.end <= word.start
      || word.end > duration + 0.00001 || word.start < previous) {
      throw new Error(`Invalid word timing at index ${index}: require ordered start < end within film duration`);
    }
    const precision = word.precision ?? fallback;
    if (!PRECISIONS.has(precision)) throw new Error(`Invalid word precision at index ${index}`);
    previous = word.start;
    return { ...word, text: (word.text ?? word.word).trim(), precision };
  });
}

/** Anchors use zero-based word index or text plus one-based occurrence. */
function at(value, words, label) {
  if (finite(value)) return value;
  if (!value || typeof value !== 'object' || value.word === undefined) throw new Error(`${label} must be seconds or a word anchor`);
  const occurrence = value.occurrence ?? 1;
  if (!Number.isInteger(occurrence) || occurrence < 1) throw new Error(`${label}: anchor occurrence must be positive`);
  let word;
  if (Number.isInteger(value.word)) word = words[value.word];
  else if (typeof value.word === 'string') word = words.filter((w) => cleanWord(w.text) === cleanWord(value.word))[occurrence - 1];
  if (!word) throw new Error(`${label}: word anchor ${JSON.stringify(value.word)} was not found`);
  const edge = value.edge ?? 'start';
  if (!['start', 'end'].includes(edge) || !finite(value.offset ?? 0)) throw new Error(`${label}: invalid word anchor edge or offset`);
  return word[edge] + (value.offset ?? 0);
}

export function resolveTimeline(config, providedWords = []) {
  const duration = config.duration;
  if (!finite(duration) || duration <= 0) throw new Error('Film duration must be a positive number');
  const voice = config.audio?.voice;
  if (!Array.isArray(providedWords)) throw new Error('Provided words must be an array');
  if (voice?.words !== undefined && !Array.isArray(voice.words)) throw new Error('Voice words must be an array');
  if (voice?.segments !== undefined && !Array.isArray(voice.segments)) throw new Error('Voice segments must be an array');
  const start = voice?.start ?? 0;
  if (!finite(start) || start < 0) throw new Error('Voice start must be non-negative seconds');
  let raw = providedWords.length ? providedWords : voice?.words;
  if (!raw?.length && voice?.segments?.length) {
    let last = -1;
    raw = voice.segments.flatMap((s, i) => {
      if (!finite(s.start) || !finite(s.end) || s.start < 0 || s.end <= s.start || s.start < last || s.end + start > duration + 0.00001) {
        throw new Error(`Invalid narration segment ${i}: timing must be ordered and within film duration`);
      }
      last = s.end;
      return spread(s.text, s.start + start, s.end + start, 'interpolated');
    });
  } else if (!raw?.length && voice?.script) {
    const length = voice.duration ?? duration - start;
    if (!finite(length) || length <= 0 || start + length > duration + 0.00001) throw new Error('Voice duration exceeds film duration');
    raw = spread(voice.script, start, start + length, 'estimated');
  } else if (raw?.length && !providedWords.length && start) {
    raw = raw.map((w) => ({ ...w, start: w.start + start, end: w.end + start }));
  }
  const words = validateWords(raw ?? [], duration, voice?.precision ?? 'interpolated');
  const precision = words.some((w) => w.precision === 'estimated') ? 'estimated'
    : words.some((w) => w.precision === 'interpolated') ? 'interpolated' : words.length ? 'recognized' : null;
  let previousEnd = 0;
  const scenes = (config.scenes ?? []).map((s, i) => {
    const start = at(s.start, words, `Scene ${s.id ?? i} start`);
    const end = at(s.end, words, `Scene ${s.id ?? i} end`);
    if (start < 0 || end <= start || end > duration + 0.00001) throw new Error(`Scene ${s.id ?? i} lies outside film duration or has an invalid range`);
    if (start < previousEnd - 0.00001) throw new Error(`Scene ${s.id ?? i} overlaps a previous scene or is out of order`);
    previousEnd = end;
    return { ...s, start, end };
  });
  const sfx = (config.audio?.sfx ?? []).map((s, i) => {
    const time = at(s.time ?? s.at, words, `Sound ${i} time`);
    if (time < 0 || time >= duration) throw new Error(`Sound ${i} lies outside film duration`);
    return { ...s, time };
  });
  return { duration, scenes, sfx, words, precision };
}

const stamp = (seconds) => {
  const total = Math.round(seconds * 1000);
  const ms = total % 1000, s = Math.floor(total / 1000) % 60, m = Math.floor(total / 60000) % 60, h = Math.floor(total / 3600000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
};

// SRT has no precision field; the adjacent words JSON carries that metadata.
export function wordsToSrt(words, { maxChars = 44, maxDuration = 4 } = {}) {
  const groups = [];
  for (const word of words) {
    let group = groups.at(-1);
    const text = word.text.replace(/[\r\n]+/g, ' ');
    if (!group || group.text.length + text.length + 1 > maxChars || word.end - group.start > maxDuration || word.start - group.end > 0.6) {
      group = { start: word.start, end: word.end, text };
      groups.push(group);
    } else { group.text += ` ${text}`; group.end = word.end; }
  }
  return groups.map((g, i) => `${i + 1}\n${stamp(g.start)} --> ${stamp(Math.max(g.start + 0.001, g.end))}\n${g.text}\n`).join('\n');
}
