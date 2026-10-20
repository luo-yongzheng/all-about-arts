import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir, copyFile, rename, mkdtemp, rm, realpath } from 'node:fs/promises';
import { join, dirname, extname, relative, sep, isAbsolute } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { inspectAudio, projectRoot } from './audio.mjs';
import { resolveTimeline } from './timeline.mjs';
import { withLock } from './util.mjs';

async function saveConfig(root, config) {
  const file = join(root, 'aaa.json'), temporary = `${file}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(config, null, 2)}\n`);
  await rename(temporary, file);
}
const readConfig = async (root) => JSON.parse(await readFile(join(root, 'aaa.json'), 'utf8'));

/** Import never changes the original; the project receives a content-addressed copy. */
export async function importVoice(project, options = {}) {
  return withLock(join(projectRoot(project), '.aaa/state/build.lock'), () => importVoiceUnlocked(project, options));
}
async function importVoiceUnlocked(project, { file, script, segments, words, precision, start = 0, volume = 1, generatedMetadata } = {}) {
  const root = await realpath(projectRoot(project));
  if (typeof file !== 'string' || !file) throw new Error('Voice import requires an audio file');
  if (typeof script !== 'string' || !script.trim()) throw new Error('Voice import requires the narration script');
  if (!Number.isFinite(start) || start < 0 || !Number.isFinite(volume) || volume < 0 || volume > 4) throw new Error('Invalid voice start or volume');
  if (words !== undefined && !Array.isArray(words)) throw new Error('Voice words must be an array');
  if (segments !== undefined && !Array.isArray(segments)) throw new Error('Voice segments must be an array');
  const audio = await inspectAudio(file), config = await readConfig(root);
  if (start + audio.duration > config.duration + 1 / 48000) throw new Error(`Voice duration (${audio.duration.toFixed(3)}s) is longer than the available film duration; extend the film first`);
  const preliminary = { file: '', script: script.trim(), duration: audio.duration, start, volume };
  if (words?.length) preliminary.words = words;
  if (segments?.length) preliminary.segments = segments;
  if (precision) preliminary.precision = precision;
  // Validate alignment against the actual source, before adding its placement offset.
  resolveTimeline({ duration: audio.duration, audio: { voice: { ...preliminary, start: 0 } } });
  const timeline = resolveTimeline({ ...config, audio: { ...config.audio, voice: preliminary } });
  const extension = /^\.[a-zA-Z0-9]{1,8}$/.test(extname(file)) ? extname(file).toLowerCase() : '.audio';
  const assetDir = join(root, 'assets');
  await mkdir(assetDir, { recursive: true });
  const assetReal = await realpath(assetDir), rel = relative(root, assetReal);
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error('Voice assets directory must remain inside the project');
  const relativeFile = `assets/voice-${audio.hash}${extension}`, destination = join(root, relativeFile);
  // Copy to a unique sibling before renaming so a pre-existing symlink is never followed.
  const temporary = `${destination}.${randomUUID()}.tmp`;
  await copyFile(file, temporary);
  await rename(temporary, destination);
  const voice = { ...preliminary, file: relativeFile, precision: timeline.precision, sourceHash: audio.hash, ...generatedMetadata };
  const asset = { id: 'voice-narration', path: relativeFile, sha256: audio.hash, bytes: audio.bytes, source: generatedMetadata ? `generated:${generatedMetadata.provider}` : 'user', license: generatedMetadata?.license ?? 'user-provided', purpose: 'voice', required: true, restore: generatedMetadata ? {method:'regenerate-voice',provider:generatedMetadata.provider} : { method: 'reimport-original', source: 'user' } };
  await saveConfig(root, { ...config, assets: [...(config.assets ?? []).filter((a) => a.id !== asset.id), asset], audio: { ...config.audio, voice } });
  return voice;
}

/** Local system speech or a caller-configured argv adapter. No provider is downloaded. */
export async function generateVoice(project, options = {}) {
  const root = projectRoot(project), config = await readConfig(root);
  const settings = { ...(config.audio?.tts ?? {}), ...Object.fromEntries(Object.entries(options).filter(([, value]) => value !== undefined)) };
  const { script } = settings;
  if (typeof script !== 'string' || !script.trim()) throw new Error('Voice generation requires a narration script');
  const provider = settings.provider ?? 'say';
  const network = settings.network === true || provider === 'online';
  if (network && settings.allowOnline !== true && process.env.AAA_ALLOW_ONLINE_TTS !== '1') throw new Error('Online TTS needs explicit opt-in: allowOnline: true or AAA_ALLOW_ONLINE_TTS=1');
  const directory = await mkdtemp(join(tmpdir(), 'aaa-voice-'));
  try {
    let executable, args, output;
    if (provider === 'say') {
      if (process.platform !== 'darwin') throw new Error('The say provider requires macOS; import audio or configure a local TTS command');
      output = join(directory, 'speech.aiff');
      const scriptFile = join(directory, 'script.txt');
      await writeFile(scriptFile, script);
      executable = settings.python ?? 'python3';
      args = [join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'voice-local.py'), '--script-file', scriptFile, '--output', output];
      if (settings.voice) args.push('--voice', String(settings.voice));
      if (settings.rate !== undefined) args.push('--rate', String(settings.rate));
    } else if (provider === 'command' || provider === 'online') {
      let command = settings.command;
      if (!command && process.env.AAA_TTS_COMMAND) {
        try { command = JSON.parse(process.env.AAA_TTS_COMMAND); } catch { throw new Error('AAA_TTS_COMMAND must be a JSON argv array'); }
      }
      if (!Array.isArray(command) || !command.length || command.some((v) => typeof v !== 'string') || !command.some((v) => v.includes('{output}'))) throw new Error('TTS command must be an argv array with an {output} placeholder');
      output = join(directory, 'speech.wav');
      const scriptFile = join(directory, 'script.txt');
      await writeFile(scriptFile, script);
      const replacements = { '{output}': output, '{script}': script, '{scriptFile}': scriptFile, '{voice}': String(settings.voice ?? '') };
      [executable, ...args] = command.map((part) => part.replace(/\{output\}|\{script\}|\{scriptFile\}|\{voice\}/g, (match) => replacements[match]));
    } else throw new Error(`Unknown voice provider: ${provider}`);
    const child = spawnSync(executable, args, { encoding: 'utf8', timeout: 120000, maxBuffer: 1024 * 1024, shell: false, cwd: root });
    if (child.error || child.status !== 0) throw new Error(`Voice generation failed: ${child.error?.message ?? child.stderr?.trim().slice(-1500) ?? child.status}`);
    return await importVoice(root, { file: output, script, start: settings.start ?? 0, volume: settings.volume ?? 1, segments: settings.segments, words: settings.words, precision: settings.precision, generatedMetadata:{provider,generated:true,network,license:settings.license??'provider-terms-unverified'} });
  } finally { await rm(directory, { recursive: true, force: true }); }
}
