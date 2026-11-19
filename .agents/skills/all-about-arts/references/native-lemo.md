# Native Lemo production

The production library is at `<skill>/vendor/lemo-opuscar`, independent of the downloaded checkout. The native commands execute its render tools and projects reuse its style engines. All 99 styles (Lemo-Opuscar 2.0.x) have specifications, demo source and posters. Prefer this route for new original films; the eight legacy presets remain available for existing Studio projects. Unused upstream plugin installers and publishing files are excluded.

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

**On-screen language belongs to the film.** Many STYLE.md files stack a Chinese line over an English one because the demos are bilingual. A one-language film sets that line alone, in the upper line's place and size; a bilingual film keeps the stack with its main language on top (DIRECTOR.md §1).

**Maps.** Every map, globe or satellite frame follows DIRECTOR.md §13: no borders unless the film is about them; when China is in frame, draw its full territory; default Natural Earth / world-atlas / OSM borders are not acceptable for that; labels, subtitles and narration follow the same rule; CREDITS name the map data and its view. Check every map shot enlarged before delivery.

**Python-rendered styles.** firefly-pointillism and oscilloscope-math draw frames in Python (`demo/film.py`, `build.sh`), not in a web page. `lemo init` still creates the planning files, but the page scaffold does not apply: build the film from the demo's Python pipeline, and use its `readcheck` bridge page for text timing. Catalog entries mark these with `native.engine: "python"`.

Whiteboard's `EMSTech.json` has 187 glyphs and **no Chinese glyphs**; its text helper substitutes `?` for missing characters. Check every character in the actual script before drawing: author/acquire appropriate stroke glyphs for Chinese handwriting, or explicitly design readable CJK typesetting with a suitable project font. A CJK system font does not automatically add stroke-order data to this engine. The paper-lightbox demo's four CJK font files are also external. Full paper-lightbox, glass, character, ink and brush engines are bundled; original geometry and required assets still need authoring.

## Image-generation styles

comic-history, manga-panels and text-flash-cuts (catalog `requires: ["image-generation"]`, ✦ upstream) draw characters, props or panels with an image generator. The library has none: the user brings one.

- Before the brief questions, run `python3 core/image/gen_image.py --check` from `$LEMO`. Exit 0 means the user's Codex CLI is installed and signed in; exit 4 means it is not. It sends nothing.
- If the check fails, ask which other image tool they will use (an API, an app or their own drawings); STYLE.md gives prompts, sizes and file names. With neither, the film cannot start: say so and offer other fitting styles. Never draw stand-in characters in code.
- Prompts and reference images go to the user's chosen service. Tell the user how many images and of what before generating, and record each image in CREDITS / the asset receipts ([assets.md](assets.md)).
- When recommending one of these styles, state that it needs an image generator.

## Sound and review tools

Follow the [production guide](../vendor/lemo-opuscar/TECHNIQUE.md). From `$LEMO`, use:

| Need | Tool |
| --- | --- |
| Contact sheet / subtitles | `core/render/sheet.py`, `core/render/srt.py` |
| Sampled music / physical strings / foley | `core/audio/sampler.py`, `pluck.py`, `sfx.py` and the style's score scripts |
| English offline / Chinese online voice | `core/tts/tts.py`, `tts_zh.py` |
| Speech recognition / word times | `core/tts/asr_check.py` |
| Final mixing / loudness | `sh core/render/mux.sh <video> <mix.wav> <final.mp4> <fps>` (FFmpeg 7+; peaks at or under −1 dBTP) |
| Cue consistency | The selected style's `demo/tools/cuecheck.py`, where supplied |

Native `video` renders picture; it does not automatically synthesize narration, music or final audio. Complete build.sh with the project's score, mix and mux. Use `still --range` for contact sheets and 0.2-second action strips. Inspect important transitions and text, listen to the film at full speed, and compare its contact sheet with the reference. Use FFmpeg/ffprobe to inspect final dimensions, frame rate, duration, blank frames and loudness. Document deliberate black frames or silence in the treatment.

## Dependencies and offline boundary

Every tracked file in the supplied checkout is included, except upstream installer/publishing files. Files omitted from that checkout are still external. No clone, network update, model download or package install runs automatically.

- JavaScript uses the skill's locked Playwright/Three.js packages; install missing packages with `npm ci --ignore-scripts` in the skill.
- System tools: Node 22+ for this skill, **FFmpeg 7+** (6.x under-reports `loudnorm` audio length and `mux.sh` then rejects the file), Python 3.11+. `aaa lemo doctor --json` flags an older FFmpeg.
- `core/audio/sampler.py` downloads missing sample libraries by itself when a score renders. Run Python audio tools with `LEMO_FETCH=0` unless the task authorizes those downloads; it then stops and names the `fetch.sh` commands instead.
- Native Python tools use the snapshot's `requirements.txt`; optional voice and strings add `requirements-voice.txt` / `requirements-music.txt`. Install only needed tiers into a local virtual environment and use that interpreter.
- [tools/assets.json](../vendor/lemo-opuscar/tools/assets.json) records hashes for seven external packs totaling **1,787,770,880 bytes**: voice, HDRI, FreePats, Karoryfer, Salamander, VCSL and VSCO2CE. Their index and [fetch tool](../vendor/lemo-opuscar/tools/fetch.sh) are included; the packs are not. Download only the needed resources within the task's authorization.
- Demo media, full CJK fonts, footage/scans/CAD, model weights and final MP4s may be absent. Follow the style's tools and CREDITS and supply the material required for the new film.
- Upstream plugin setup scripts (`plugin/skills/lemo-opuscar/scripts/setup.sh`) are not included. AGENTS.md, original manuals and some dependency error messages still mention them; run `aaa lemo doctor --json` instead and use the requirements files and commands above for this installed skill.

## Delivery

Deliver final MP4, poster, applicable SRT (named like the video for soft subtitles; `subtitles_<lang>.srt` when subtitles are burned in, so players don't show every line twice), treatment, credits, FACTS.md when factual, a timestamped review log, editable source and a working build.sh. Include shared engine dependencies or a pinned toolkit snapshot when standalone rebuilding is required. Verify a copied build outside the original checkout: an absolute path to this installation alone is not standalone delivery.

Keep earlier outputs when revising. Record missing models and unviewed sound honestly. Neither bundled source nor a rendered scaffold proves artistic quality.
