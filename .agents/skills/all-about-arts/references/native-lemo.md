# Native Lemo production

The production library is at `<skill>/vendor/lemo-opuscar`, independent of the downloaded checkout. The native commands execute its render tools and projects reuse its style engines. All 59 styles have specifications, demo source and posters. Prefer this route for new original films; the eight legacy presets remain available for existing Studio projects. Unused upstream plugin installers and publishing files are excluded.

## Commands

Below, `aaa` means `node <absolute-skill-path>/scripts/aaa.mjs`:

```sh
aaa styles 白板 --json
aaa lemo root --json
aaa lemo doctor --json
aaa lemo init <project> --style whiteboard --title '城市为何更热' --duration 45
aaa lemo still <project> 0 8 20 --size 1920x1080
aaa lemo video <project> --fps 24 --size 1920x1080 --workers 2 --out <project>/out/video.mp4
aaa lemo events <project>
aaa lemo readcheck <project>
```

`init` creates an **unfinished scaffold**, not a finished film. Author the treatment and drawing code. Native pages expose `window.DUR`, `window.render(t)` and `window.READY`; register `window.EV` for sound and `window.TEXTS(t)` for reading checks. Native flags are in the full [command reference](../vendor/lemo-opuscar/core/README.md). Use the same `--size` for still, video and readability tools; portrait needs its own composition.

`lemo-project.json` is separate from `aaa.json`. Native pages do not automatically gain legacy Studio, `aaa check` or `aaa export`. Use native checks and the project's build script; report unavailable checks as `not-checked`.

## Use the actual engine

Read the selected STYLE.md and [director.md](director.md), write the treatment, then open DEMO.md and only the engine modules needed. Documentary material-gathering tools are the specified exception to this ordering. Copy techniques into the project, replace demo subjects/timings and preserve attribution.

The native server serves the library root and mounts external projects at `/@film/`. Shared page imports use `/core/lib.js` or `/node_modules/three/...`; project modules use `./engine/...`. Replace copied demo-relative library paths. The bridge exposes installed package dependencies to the native server.

Direct scripts run from the native library with absolute project paths. Set `LEMO=<skill>/vendor/lemo-opuscar`; upstream documentation calls it `LIB`. The bridge supplies Chrome via `PLAYWRIGHT_CHROME` and supports `AAA_CHROME`. Direct upstream commands need `PLAYWRIGHT_CHROME` if Playwright's browser is absent.

Whiteboard's `EMSTech.json` has 187 glyphs and **no Chinese glyphs**; its text helper substitutes `?` for missing characters. Check every character in the actual script before drawing: author/acquire appropriate stroke glyphs for Chinese handwriting, or explicitly design readable CJK typesetting with a suitable project font. A CJK system font does not automatically add stroke-order data to this engine. The paper-lightbox demo's four CJK font files are also external. Full paper-lightbox, glass, character, ink and brush engines are bundled; original geometry and required assets still need authoring.

## Sound and review tools

Follow the [production guide](../vendor/lemo-opuscar/TECHNIQUE.md). From `$LEMO`, use:

| Need | Tool |
| --- | --- |
| Contact sheet / subtitles | `core/render/sheet.py`, `core/render/srt.py` |
| Sampled music / physical strings / foley | `core/audio/sampler.py`, `pluck.py`, `sfx.py` and the style's score scripts |
| English offline / Chinese online voice | `core/tts/tts.py`, `tts_zh.py` |
| Speech recognition / word times | `core/tts/asr_check.py` |
| Final mixing / loudness | `sh core/render/mux.sh <video> <mix.wav> <final.mp4> <fps>` |
| Cue consistency | The selected style's `demo/tools/cuecheck.py`, where supplied |

Native `video` renders picture; it does not automatically synthesize narration, music or final audio. Complete build.sh with the project's score, mix and mux. Use `still --range` for contact sheets and 0.2-second action strips. Inspect important transitions and text, listen to the film at full speed, and compare its contact sheet with the reference. Use FFmpeg/ffprobe to inspect final dimensions, frame rate, duration, blank frames and loudness. Document deliberate black frames or silence in the treatment.

## Dependencies and offline boundary

Every tracked file in the supplied checkout is included. Files omitted from that checkout are still external. No clone, network update, model download or package install runs automatically.

- JavaScript uses the skill's locked Playwright/Three.js packages; install missing packages with `npm ci --ignore-scripts` in the skill.
- Native Python tools use the snapshot's `requirements.txt`; optional voice and strings add `requirements-voice.txt` / `requirements-music.txt`. Install only needed tiers into a local virtual environment and use that interpreter.
- [tools/assets.json](../vendor/lemo-opuscar/tools/assets.json) records hashes for seven external packs totaling **1,787,770,880 bytes**: voice, HDRI, FreePats, Karoryfer, Salamander, VCSL and VSCO2CE. Their index and [fetch tool](../vendor/lemo-opuscar/tools/fetch.sh) are included; the packs are not. Download only the needed resources within the task's authorization.
- Demo media, full CJK fonts, footage/scans/CAD, model weights and final MP4s may be absent. Follow the style's tools and CREDITS and supply the material required for the new film.
- Upstream plugin setup scripts are not included. Original manuals and some dependency error messages still mention them; use the requirements files and commands above for this installed skill.

## Delivery

Deliver final MP4, poster, applicable SRT, treatment, credits, FACTS.md when factual, a timestamped review log, editable source and a working build.sh. Include shared engine dependencies or a pinned toolkit snapshot when standalone rebuilding is required. Verify a copied build outside the original checkout: an absolute path to this installation alone is not standalone delivery.

Keep earlier outputs when revising. Record missing models and unviewed sound honestly. Neither bundled source nor a rendered scaffold proves artistic quality.
