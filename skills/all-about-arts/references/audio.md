# Audio, narration, and the shared clock

Audio is generated locally at 48 kHz. FFmpeg and ffprobe must already be installed; these tools do not install packages or download models. `buildAudio(project, config, {force})` returns `status: "success"`, a `mode` of `built`, `cached`, or `silent`, the mix `path` (null for silent films), the SRT `subtitles` path, `wordsPath`, word cues, their precision, and a fingerprint. Invalid input throws a useful error and prevents rendering.

The mix is a stereo 16-bit WAV with exactly `round(duration * 48000)` samples. Short narration is padded by the mix bed; narration longer than the film is rejected. Extend the film or edit the source explicitly. The renderer can mux this WAV using argument-array FFmpeg inputs without `-shortest`; it must validate the finished media duration. Voices are downmixed to mono before placement. Music and event tails end at the film boundary.

## Local music and event sounds

```json
{
  "audio": {
    "music": {"enabled": true, "volume": 0.18, "bpm": 96, "duckDb": 10},
    "sfx": [
      {"name": "pop", "time": 0.8, "volume": 0.3},
      {"name": "ding", "time": {"word": "reveal", "edge": "start"}}
    ]
  }
}
```

Music uses a deterministic seeded arpeggio and bass score whose sections start on scene boundaries. Pixel/game styles use a brighter harmonic voice; other styles use softer struck notes. This is a small procedural score engine, not the complete upstream instrument library or a generative music service. Change `seed` to change the score. Music is off by default.

Event sounds: `tick`, `click`, `pop`, `ding`, `chime`, `sparkle`, `whoosh`, `riser`, `thud`, `impact`, and `hit`. Each accepts `time`, optional `duration` (seconds), `volume` (0–4), and `pan` (−1 to 1). `riser` ends at its cue; the other sounds start there. The three bell names select two related bell timbres; they are intentionally not separate sampled instruments. Unsupported names fail rather than silently disappearing.

Music drops by `duckDb` during narration, with short gaps bridged and smooth attack/release. The default is 10 dB. Event sounds and the voice keep their own levels. The final mix reduces gain only when its peak would exceed 0.98; `limiterGain` records that reduction. This is peak control, not LUFS normalization or a broadcast loudness certification.

## Import or generate narration

```sh
node scripts/aaa.mjs voice /path/to/film import --file /path/to/narration.wav --script-file /path/to/script.txt --json
node scripts/aaa.mjs voice /path/to/film generate --provider say --script-file /path/to/script.txt --json
node scripts/aaa.mjs audio /path/to/film --json
```

`importVoice(project, {file, script, segments?, words?, precision?, start?, volume?})` copies the original audio into `assets/voice-<sha256>.<extension>` and registers a required voice asset with its content hash, source and license label. It validates the whole decoded source before changing `aaa.json`. Files with corrupt/truncated WAV headers, decode errors, empty samples, or a decoded length materially shorter than a container's declared duration are rejected. A compressed recording that was intentionally shortened into another valid file cannot always be identified as truncated without an independent expected duration or checksum; registered asset hashes provide that separate integrity check during rendering.

`generateVoice(project, options)` uses the already installed macOS `say` voice by default. Optional `voice` and `rate` select an installed system voice and words per minute. The helper is `scripts/voice-local.py`, which uses Python's standard library and invokes `say` without a shell. Missing providers/models fail clearly; no fallback downloads occur.

An existing local TTS program can be configured in `audio.tts`:

```json
{
  "provider": "command",
  "command": ["/absolute/path/to/tts", "--text-file", "{scriptFile}", "--output", "{output}"],
  "network": false
}
```

Supported argument substitutions are `{script}`, `{scriptFile}`, `{output}`, and `{voice}`. The array is executed directly, without a shell. `AAA_TTS_COMMAND` may contain the same JSON argument array. Credentials should remain in the provider's own environment/configuration, not `aaa.json` or command arguments.

There is no built-in online provider. A user-configured adapter marked `network: true` or `provider: "online"` requires `allowOnline: true` or `AAA_ALLOW_ONLINE_TTS=1` before invocation. The adapter is trusted user code; the tool does not sandbox or inspect its network activity. Generated voice assets record the provider and use `provider-terms-unverified` unless the caller supplies a `license` label. This metadata is a provenance record, not a rights determination.

## Timing and subtitles

All scene, sound, voice and subtitle cues resolve onto the same seconds clock:

```json
{
  "scenes": [{"id": "reveal", "start": {"word": "change", "occurrence": 2}, "end": 10}],
  "audio": {
    "voice": {
      "file": "assets/voice-example.wav",
      "script": "A change. Another change.",
      "start": 0.5,
      "words": [
        {"text": "A", "start": 0, "end": 0.2, "precision": "recognized"},
        {"text": "change", "start": 0.2, "end": 0.6, "precision": "recognized"},
        {"text": "Another", "start": 0.8, "end": 1.1, "precision": "recognized"},
        {"text": "change", "start": 1.1, "end": 1.5, "precision": "recognized"}
      ]
    },
    "sfx": [{"name": "ding", "time": {"word": 3, "edge": "end", "offset": 0.05}}]
  }
}
```

Word indices are zero based. Text lookup ignores case and punctuation; `occurrence` is one based. `edge` is `start` or `end`; `offset` is seconds. Unknown anchors, out-of-range cues, or overlapping/out-of-order resolved scenes block the build. Inputs are not mutated.

Imported `words` and `segments` are source-local; `voice.start` moves them onto the film clock. `resolveTimeline(config)` applies that offset. `buildAudio.words` are already absolute; `resolveTimeline(config, buildAudio.words)` does not offset them again.

- `estimated`: script words spread proportionally across the decoded source duration. These are not recognized word boundaries.
- `interpolated`: words spread within caller-supplied `{text,start,end}` segments, or external word cues without an explicit recognition label.
- `recognized`: the caller explicitly labels external aligned/recognized words. This package does not run ASR or verify an external aligner's accuracy.

The mix directory includes `subtitles.srt` and `words.json`. SRT contains standard subtitle text/timestamps; JSON carries the precision labels and explanation. Deliver both. CJK script text is tokenized with the Node runtime's word segmenter, so runtime/code versions belong in delivery reproducibility records.

## Cache and provenance

The cache includes the complete configuration, resolved timeline, source-audio byte hash, audio/timeline/voice implementation bytes and FFmpeg version. Cache outputs have their own content hashes. A modified or missing output rebuilds; an invalid input blocks even if a previous cache exists. Render asset validation independently enforces registered source checksums.

The MIT-licensed Huashu seeded generator, partial synthesis and narration ducking were ported/adapted into the implementation, with the notice preserved in `lib/audio.mjs`. The upstream commit, source hashes and exact adaptation scope are in `provenance/audio-upstreams.json`. No runtime import reaches into an upstream checkout.
