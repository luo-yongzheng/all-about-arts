/* Portions adapted from huashu-motion/cli/lib/dsp.js and sound.js.
 * MIT License — Copyright (c) 2026 Huashu
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir, rename, realpath, stat, lstat } from 'node:fs/promises';
import { resolve, join, dirname, isAbsolute, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveTimeline, wordsToSrt } from './timeline.mjs';

export const SAMPLE_RATE = 48000;
const TAU = 2 * Math.PI;
const hash = (data) => createHash('sha256').update(data).digest('hex');
const ffmpeg = () => process.env.AAA_FFMPEG || 'ffmpeg';
const ffprobe = () => process.env.AAA_FFPROBE || 'ffprobe';
export const projectRoot = (project) => resolve(typeof project === 'string' ? project : project.root ?? project.path);
const finite = (n) => typeof n === 'number' && Number.isFinite(n);
const frame = (t) => Math.round(t * SAMPLE_RATE);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { maxBuffer: 256 * 1024 * 1024, timeout: 120000, ...options });
  if (result.error) throw new Error(`Could not run ${command}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`Audio decode/tool failure (${command}): ${result.stderr?.toString().trim().slice(-2000) || result.signal || result.status}`);
  return result;
}

export async function resolveAudioAsset(project, file) {
  if (typeof file !== 'string' || !file || isAbsolute(file) || file.includes('\0')) throw new Error('Audio asset must be a project-relative file');
  const root = await realpath(projectRoot(project));
  const lexical = resolve(root, file);
  if (relative(root, lexical).startsWith(`..${sep}`) || lexical === dirname(root)) throw new Error('Audio asset escapes the project');
  const actual = await realpath(lexical);
  const rel = relative(root, actual);
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error('Audio asset must remain inside the project');
  if (!(await stat(actual)).isFile()) throw new Error('Audio asset must be a file');
  return actual;
}

function inspectWav(bytes) {
  if (bytes.length < 12 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') return;
  if (bytes.readUInt32LE(4) + 8 > bytes.length) throw new Error('Truncated WAV: declared length exceeds source bytes');
  let offset = 12, foundData = false;
  while (offset + 8 <= bytes.length) {
    const size = bytes.readUInt32LE(offset + 4);
    if (offset + 8 + size > bytes.length) throw new Error('Truncated WAV audio chunk');
    if (bytes.toString('ascii', offset, offset + 4) === 'data') { foundData = true; if (!size) throw new Error('WAV contains no audio samples'); }
    offset += 8 + size + (size & 1);
  }
  if (!foundData) throw new Error('Malformed WAV: audio data is missing');
}

/** Fully decode before admitting a source. No shortened -t decode hides a damaged tail. */
export async function inspectAudio(file) {
  const bytes = await readFile(file);
  if (!bytes.length) throw new Error('Audio source is empty');
  inspectWav(bytes);
  const probe = run(ffprobe(), ['-v', 'error', '-protocol_whitelist', 'file,pipe', '-select_streams', 'a:0', '-show_entries', 'stream=codec_type,duration,sample_rate,channels:format=duration', '-of', 'json', file], { encoding: 'utf8' });
  const info = JSON.parse(probe.stdout), stream = info.streams?.[0];
  if (stream?.codec_type !== 'audio') throw new Error('Source contains no decodable audio stream');
  const decoded = run(ffmpeg(), ['-nostdin', '-v', 'error', '-xerror', '-err_detect', 'explode', '-protocol_whitelist', 'file,pipe', '-i', file, '-map', '0:a:0', '-vn', '-sn', '-dn', '-ac', '1', '-ar', String(SAMPLE_RATE), '-f', 'f32le', 'pipe:1']).stdout;
  if (!decoded.length || decoded.length % 4) throw new Error('Audio decoded to an invalid sample length');
  const samples = new Float32Array(decoded.buffer.slice(decoded.byteOffset, decoded.byteOffset + decoded.byteLength));
  if (samples.some((x) => !Number.isFinite(x))) throw new Error('Audio has non-finite decoded samples');
  const duration = samples.length / SAMPLE_RATE;
  const declared = Number(stream.duration ?? info.format?.duration);
  if (finite(declared) && declared > 0 && duration + Math.max(0.12, declared * 0.01) < declared) throw new Error(`Audio decode length is shorter than declared duration (${duration} < ${declared}); source may be truncated`);
  return { duration, sampleRate: SAMPLE_RATE, sourceSampleRate: Number(stream.sample_rate), channels: Number(stream.channels), samples, hash: hash(bytes), bytes: bytes.length };
}

// Seeded generator ported from Huashu DSP. Never depend on a shared global RNG.
function rng(seed) {
  let a = typeof seed === 'number' ? seed >>> 0 : [...String(seed)].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0, 2166136261);
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Adapted struck-note partial synthesis; loop order and attack/release are fixed.
function partials(frequency, seconds, list, attack = 0.004) {
  const n = Math.max(1, frame(seconds)), out = new Float32Array(n);
  for (const [ratio, amplitude, tau] of list) {
    const f = frequency * ratio;
    if (f > SAMPLE_RATE * 0.45) continue;
    let phase = 0, envelope = amplitude;
    const increment = f / SAMPLE_RATE, decay = Math.exp(-1 / (tau * SAMPLE_RATE));
    for (let i = 0; i < n; i++) { out[i] += Math.sin(TAU * phase) * envelope; phase += increment; envelope *= decay; }
  }
  const a = Math.max(1, frame(attack)), release = Math.min(n, frame(0.02));
  for (let i = 0; i < Math.min(a, n); i++) out[i] *= i / a;
  for (let i = 0; i < release; i++) out[n - 1 - i] *= i / release;
  return out;
}

function add(bus, signal, time, gain = 1, pan = 0) {
  const angle = (pan + 1) * Math.PI / 4, left = Math.cos(angle) * Math.SQRT2 * gain, right = Math.sin(angle) * Math.SQRT2 * gain;
  const offset = frame(time), begin = Math.max(0, -offset);
  for (let i = begin; i < signal.length && offset + i < bus[0].length; i++) { bus[0][offset + i] += signal[i] * left; bus[1][offset + i] += signal[i] * right; }
}
const bus = (duration) => [new Float32Array(frame(duration)), new Float32Array(frame(duration))];
const midi = (n) => 440 * 2 ** ((n - 69) / 12);
const bounded = (n, min, max, label) => { if (!finite(n) || n < min || n > max) throw new Error(`${label} must be between ${min} and ${max}`); return n; };

function musicTrack(config, timeline) {
  const out = bus(config.duration), music = config.audio?.music ?? {};
  if (!music.enabled) return out;
  const gain = bounded(music.volume ?? 0.18, 0, 2, 'Music volume');
  const bpm = bounded(music.bpm ?? 96, 30, 240, 'Music BPM');
  const beat = 60 / bpm, random = rng(`${config.seed ?? 42}:music`);
  const root = 48 + Math.floor(random() * 7), progression = [0, 5, 3, 7];
  const scenes = timeline.scenes.length ? timeline.scenes : [{ start: 0, end: config.duration }];
  const chip = /pixel|arcade|game|8-bit/.test(music.style ?? config.style ?? '');
  const harmonics = chip ? [[1, 0.7, 0.16], [3, 0.18, 0.12], [5, 0.1, 0.08]] : [[1, 0.7, 0.45], [2, 0.2, 0.18], [3, 0.08, 0.1]];
  for (const [section, scene] of scenes.entries()) {
    const chord = root + progression[section % 4];
    let i = 0;
    for (let time = scene.start; time < scene.end; time += beat / 2, i++) {
      const note = [0, 4, 7, 12, 7, 4, 9, 7][(i + Math.floor(random() * 2)) % 8];
      add(out, partials(midi(chord + 12 + note), Math.min(0.65, scene.end - time), harmonics), time, gain * (section === 0 ? 0.65 : 0.85), i % 2 ? 0.25 : -0.25);
      if (i % 4 === 0) add(out, partials(midi(chord), Math.min(beat * 1.8, scene.end - time), [[1, 0.5, 0.5], [2, 0.1, 0.3]], 0.015), time, gain);
    }
  }
  // A musical fade over the ending, independent of voice and event sounds.
  for (let i = 0; i < out[0].length; i++) { const fade = Math.min(1, i / frame(0.04), (out[0].length - 1 - i) / frame(0.25)); out[0][i] *= fade; out[1][i] *= fade; }
  return out;
}

function effect(name, duration, random) {
  const n = Math.max(1, frame(duration)), out = new Float32Array(n);
  if (['ding', 'chime', 'sparkle'].includes(name)) {
    const base = name === 'sparkle' ? 1760 : 880;
    return partials(base, duration, [[1, 0.6, 0.4], [2.01, 0.25, 0.25], [3.93, 0.12, 0.12]]);
  }
  let phase = 0, lowNoise = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE, u = i / n, noise = random() * 2 - 1;
    lowNoise += 0.08 * (noise - lowNoise);
    if (['whoosh', 'riser'].includes(name)) out[i] = (noise - lowNoise) * Math.sin(Math.PI * u) ** 2 * 0.5;
    else if (['impact', 'thud', 'hit'].includes(name)) { phase += (48 + 130 * Math.exp(-t / 0.045)) / SAMPLE_RATE; out[i] = (Math.sin(TAU * phase) + lowNoise * 0.5) * Math.exp(-t / 0.12) * 0.65; }
    else if (['tick', 'click', 'pop'].includes(name)) { phase += (name === 'pop' ? 900 - 600 * u : 2400) / SAMPLE_RATE; out[i] = (Math.sin(TAU * phase) * 0.5 + noise * 0.2) * Math.exp(-t / (name === 'pop' ? 0.035 : 0.008)); }
    else throw new Error(`Unknown sound effect: ${name}. Use tick, click, pop, ding, chime, sparkle, whoosh, riser, thud, impact, or hit.`);
    out[i] *= Math.min(1, i / 48, (n - 1 - i) / 96);
  }
  return out;
}

// Narration span bridging and attack/release smoothing adapted from Huashu sound.js.
function duck(track, words, depth = 10) {
  if (!words.length || depth === 0) return;
  const spans = [], low = 10 ** (-depth / 20), targets = new Float32Array(track[0].length).fill(1);
  for (const word of words) { const last = spans.at(-1); if (last && word.start - last[1] < 0.3) last[1] = Math.max(last[1], word.end); else spans.push([word.start, word.end]); }
  for (const [start, end] of spans) targets.fill(low, Math.max(0, frame(start - 0.06)), Math.min(targets.length, frame(end + 0.12)));
  const attack = Math.exp(-1 / (0.03 * SAMPLE_RATE)), release = Math.exp(-1 / (0.25 * SAMPLE_RATE));
  let gain = 1;
  for (let i = 0; i < targets.length; i++) { const coefficient = targets[i] < gain ? attack : release; gain = targets[i] + (gain - targets[i]) * coefficient; track[0][i] *= gain; track[1][i] *= gain; }
}

function wav(channels) {
  const frames = channels[0].length, bytes = Buffer.alloc(44 + frames * 4);
  bytes.write('RIFF', 0); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(2, 22); bytes.writeUInt32LE(SAMPLE_RATE, 24); bytes.writeUInt32LE(SAMPLE_RATE * 4, 28); bytes.writeUInt16LE(4, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(frames * 4, 40);
  let peak = 0;
  for (let i = 0; i < frames; i++) peak = Math.max(peak, Math.abs(channels[0][i]), Math.abs(channels[1][i]));
  const gain = peak > 0.98 ? 0.98 / peak : 1;
  for (let i = 0; i < frames; i++) for (let ch = 0; ch < 2; ch++) bytes.writeInt16LE(Math.round(channels[ch][i] * gain * 32767), 44 + i * 4 + ch * 2);
  return { bytes, peak: peak * gain, limiterGain: gain };
}

async function atomic(file, bytes) { const temp = `${file}.${randomUUID()}.tmp`; await writeFile(temp, bytes); await rename(temp, file); }

async function cacheDirectory(root, fingerprint) {
  let directory = await realpath(root);
  for (const part of ['.aaa', 'state', 'audio', fingerprint]) {
    directory = join(directory, part);
    try { await mkdir(directory); } catch (error) { if (error.code !== 'EEXIST') throw error; }
    const entry = await lstat(directory);
    if (entry.isSymbolicLink() || !entry.isDirectory()) throw new Error('Audio cache directories must be real directories inside the project, not symlinks');
  }
  return directory;
}

export async function buildAudio(project, config, { force = false } = {}) {
  const root = projectRoot(project), voice = config.audio?.voice;
  let source = null, voiceFile = null;
  if (voice?.file) {
    voiceFile = await resolveAudioAsset(root, voice.file);
    source = await inspectAudio(voiceFile);
    if ((voice.start ?? 0) + source.duration > config.duration + 1 / SAMPLE_RATE) throw new Error('Voice audio is longer than the film duration; extend the film or edit the source explicitly');
  } else if (voice) throw new Error('Voice configuration requires an audio file');
  const effective = source ? { ...config, audio: { ...config.audio, voice: { ...voice, duration: source.duration } } } : config;
  const timeline = resolveTimeline(effective);
  const dir = dirname(fileURLToPath(import.meta.url));
  const code = await Promise.all(['audio.mjs', 'timeline.mjs', 'voice.mjs'].map((file) => readFile(join(dir, file))));
  const version = run(ffmpeg(), ['-version'], { encoding: 'utf8' }).stdout.split('\n')[0];
  const fingerprint = hash(Buffer.concat([Buffer.from(JSON.stringify({ config, timeline, source: source?.hash, version })), ...code]));
  const active = !!(source || config.audio?.music?.enabled || timeline.sfx.length);
  if (!active) return { status: 'success', mode: 'silent', path: null, subtitles: null, words: [], precision: null, fingerprint, timeline, duration: config.duration };
  const directory = await cacheDirectory(root, fingerprint);
  const path = join(directory, 'mix.wav'), subtitles = timeline.words.length ? join(directory, 'subtitles.srt') : null, wordsPath = timeline.words.length ? join(directory, 'words.json') : null;
  const result = { status: 'success', mode: 'built', path, subtitles, wordsPath, words: timeline.words, precision: timeline.precision, fingerprint, timeline, duration: frame(config.duration) / SAMPLE_RATE, sampleRate: SAMPLE_RATE };
  if (!force) {
    try {
      const saved = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'));
      const targets = [path, ...(subtitles ? [subtitles, wordsPath] : [])];
      const digests = await Promise.all(targets.map(async (file) => hash(await readFile(file))));
      if (saved.fingerprint === fingerprint && JSON.stringify(saved.hashes) === JSON.stringify(digests)) return { ...result, mode: 'cached', peak: saved.peak, limiterGain: saved.limiterGain };
    } catch { /* Missing or damaged cache is recomputed from validated sources. */ }
  }
  const mixed = musicTrack(config, timeline);
  const depth = bounded(config.audio?.music?.duckDb ?? 10, 0, 40, 'Music duckDb');
  duck(mixed, timeline.words, depth);
  for (const [index, event] of timeline.sfx.entries()) {
    const name = event.name ?? event.type;
    const length = bounded(event.duration ?? event.dur ?? (['ding', 'chime', 'sparkle'].includes(name) ? 1.2 : ['whoosh', 'riser', 'impact'].includes(name) ? 0.5 : 0.15), 0.005, 30, 'Sound duration');
    const gain = bounded(event.volume ?? event.gain ?? 0.3, 0, 4, 'Sound volume');
    const pan = bounded(event.pan ?? 0, -1, 1, 'Sound pan');
    const signal = effect(name, length, rng(`${config.seed ?? 42}:sfx:${index}:${event.time}:${name}`));
    add(mixed, signal, event.time - (name === 'riser' ? length : 0), gain, pan);
  }
  if (source) add(mixed, source.samples, voice.start ?? 0, bounded(voice.volume ?? 1, 0, 4, 'Voice volume'));
  const output = wav(mixed);
  await atomic(path, output.bytes);
  if (subtitles) {
    await atomic(subtitles, wordsToSrt(timeline.words));
    await atomic(wordsPath, JSON.stringify({ precision: timeline.precision, note: timeline.precision === 'recognized' ? 'Recognition/alignment labels were supplied by the caller; this tool does not perform ASR.' : 'Estimated/interpolated timing is not speech recognition.', words: timeline.words }, null, 2));
  }
  const targets = [path, ...(subtitles ? [subtitles, wordsPath] : [])];
  const hashes = await Promise.all(targets.map(async (file) => hash(await readFile(file))));
  await atomic(join(directory, 'manifest.json'), JSON.stringify({ fingerprint, hashes, duration: result.duration, peak: output.peak, limiterGain: output.limiterGain }, null, 2));
  return { ...result, peak: output.peak, limiterGain: output.limiterGain };
}
