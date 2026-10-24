# Lemo capability map

The production library is in [vendor/lemo-opuscar](../vendor/lemo-opuscar/). Its render tools and style engines are active dependencies, not an unused backup of the download. This map helps choose what to read; it does not replace the manuals or claim every demo can rebuild without its external assets. Follow this package's [SKILL.md](../SKILL.md) for active behavior. Unused upstream plugin installers and deployment files have been removed; original manuals may still describe those upstream workflows. Use [native-lemo.md](native-lemo.md) for installation and commands in this package.

## Start with the production need

| Need | Read next |
| --- | --- |
| Direct a new film: benchmark, alternative structures, staging, camera, sound, rhythm and delivery | [DIRECTOR.md](../vendor/lemo-opuscar/DIRECTOR.md), then [TECHNIQUE.md](../vendor/lemo-opuscar/TECHNIQUE.md) |
| Choose a style and understand its invariants | [59-style index](../vendor/lemo-opuscar/styles/README.md); read the selected STYLE.md |
| Learn an implementation technique | The selected style's DEMO.md and `demo/`, after a topic-specific treatment; documentary material acquisition tools may come first |
| Render a full page or inspect the page contract | [core/README.md](../vendor/lemo-opuscar/core/README.md) and [native Lemo workflow](native-lemo.md) |
| Develop or reuse a personal style | [MY-STYLES.md](../vendor/lemo-opuscar/MY-STYLES.md) |
| Browse visual references without opening all source files | [local gallery](../vendor/lemo-opuscar/styleboard/index.html), [gallery data](../vendor/lemo-opuscar/styleboard/catalog.json), style posters and `demo/stills/` |
| Determine what is actually bundled and under which terms | [snapshot manifest](../provenance/lemo-snapshot.json), [THIRD_PARTY.md](../THIRD_PARTY.md), and the selected demo's CREDITS |

## Styles and reusable production techniques

All 59 styles retain STYLE.md, DEMO.md, `style.json`, a demo page, CREDITS, a poster and a style frame. Read the full style index for names and use cases; the groups below expose the different capabilities rather than reducing them to one template.

| Family | Count | Technique entry points |
| --- | ---: | --- |
| Edit & Documentary | 8 | [caption-news](../vendor/lemo-opuscar/styles/caption-news/STYLE.md), newsreel, countdown, city-symphony, visual-investigation, kino-montage, telestrator, news-package: source discovery and logging, footage preparation, captions, split screens, montage, investigation, tactical overlays and broadcast graphics |
| Evidence Films | 8 | [satellite-briefing](../vendor/lemo-opuscar/styles/satellite-briefing/STYLE.md), briefing-board, lidar-survey, white-model, data-physical, teardown, microscope, archive-lighttable: sourced measurements, real imagery/scans/CAD, projection, material data displays and anchored annotations |
| Hand-drawn & Painting | 7 | [watercolor](../vendor/lemo-opuscar/styles/watercolor/STYLE.md), crayon-book, ink-wash, impasto, one-line, whiteboard, urban-sketch: stroke engines, pigment and paper compositing, height-lit paint, path reveals, calligraphy and procedural drawing |
| East Asian Traditions | 4 | [shadow-puppet](../vendor/lemo-opuscar/styles/shadow-puppet/STYLE.md), ukiyoe, papercut-red, paper-lantern: articulated silhouettes, woodblock grammar, cut-paper shapes, layered light and material-native transitions |
| Print & Printmaking | 5 | [risograph](../vendor/lemo-opuscar/styles/risograph/STYLE.md), halftone-dossier, woodcut, engraving, silkscreen-poster: ink separation, registration, halftone, carved marks, hatching and screen-print layers |
| Graphic & Type | 7 | [swiss-motion](../vendor/lemo-opuscar/styles/swiss-motion/STYLE.md), spy-titles, art-deco, blueprint, stained-glass, pictogram-motion, ascii-crt: type grids, title sequences, diagram construction, geometric ornament, icon choreography and CRT post-processing |
| Information & Keynote | 5 | [dataviz](../vendor/lemo-opuscar/styles/dataviz/STYLE.md), iso-infographic, dark-keynote, living-screencast, hologram-hud: chart storytelling, isometric systems, product presentation, simulated application actions and interface choreography |
| Cartoon & Anime | 4 | [scifi-toon](../vendor/lemo-opuscar/styles/scifi-toon/STYLE.md), rubber-hose, cel-anime-80s, midcentury-toon: character rigs, expressions, lip sync, pose blending, hand animation and cel effects |
| Games | 4 | [pixel-rpg](../vendor/lemo-opuscar/styles/pixel-rpg/STYLE.md), hd-2d, microgame, game-show: pixel drawing and fonts, sprites with 3D environments, rapid game-state choreography and timed show graphics |
| Cinema & Eras | 2 | [silent-film](../vendor/lemo-opuscar/styles/silent-film/STYLE.md), backrooms: pantomime, ink redraw, intertitles, film damage, found-footage camera and VHS treatment |
| Materials & 3D | 5 | [glass-product](../vendor/lemo-opuscar/styles/glass-product/STYLE.md), brick-toy, paper-popup, tilt-shift, lowpoly-island: physical materials, reflections, caustics, exploded geometry, folding, miniature staging and depth of field |

The old eight integrated renderers remain useful starter and compatibility tools. Their built-in layouts and subject choices do not define the limits of these full source styles.

## Shared picture and rendering tools

[core/README.md](../vendor/lemo-opuscar/core/README.md) documents exact flags, exit codes and environment variables.

| Capability | Files |
| --- | --- |
| Deterministic page rendering | `core/render/video.mjs`, `still.mjs`, `page.mjs`: `READY`, `render(t)`, `DUR`, frame size, query parameters and parallel workers |
| Local page serving and browser management | `core/render/serve.mjs`, `browser.mjs`, `slot.mjs`: library/project paths, browser selection and concurrent-render slots |
| Sound cues and text readability | `core/render/events.mjs`, `readcheck.mjs`: `EV`, `TEXTS(t)`, full text bounds and language-sensitive reading duration |
| Review sheets, subtitles and mastering | `core/render/sheet.py`, `srt.py`, `mux.sh`: contact sheets, SRT, audio validation, padding/cutting, two-pass loudness normalization and grain |
| Motion primitives | [core/lib.js](../vendor/lemo-opuscar/core/lib.js): seeded randomness/noise, easing, springs, monotone tracks and envelopes |
| GPU finishing | [core/three/post.js](../vendor/lemo-opuscar/core/three/post.js): depth of field, GTAO, bloom, grading and supersampling; [core/post/crt.js](../vendor/lemo-opuscar/core/post/crt.js): CRT/VHS |
| Shared material and font assets | [Poly Haven sources](../vendor/lemo-opuscar/core/assets/polyhaven/SOURCES.md), [font licenses](../vendor/lemo-opuscar/core/fonts/OFL.md) and `core/fonts/fonts.css` |

## Voice, score and sound

| Capability | Read or reuse |
| --- | --- |
| Local per-line TTS with duration output | [core/tts/tts.py](../vendor/lemo-opuscar/core/tts/tts.py), Kokoro; requires model files |
| Online Chinese neural narration | [core/tts/tts_zh.py](../vendor/lemo-opuscar/core/tts/tts_zh.py), edge-tts; caches lines and supports spoken-text overrides |
| Speech verification and word timestamps | [core/tts/asr_check.py](../vendor/lemo-opuscar/core/tts/asr_check.py), faster-whisper; requires an available recognition model |
| Sampled original music | [INSTRUMENTS.md](../vendor/lemo-opuscar/core/audio/INSTRUMENTS.md) and `sampler.py`: 97 instruments, velocity layers, round robins, pitch correction, sustained notes, stereo events, room reverb and credit generation |
| Physically modelled folk/plucked strings | `core/audio/pluck.py`: 11 presets, bends and vibrato |
| Procedural foley and mixing | `core/audio/sfx.py`, each demo's `mix.py` and score: material sounds, filters, envelopes, gain, pan, compression and limiting |
| Shared music/picture timing | TECHNIQUE.md §3, demo timelines, `music/score.py` and cue checks; useful examples: [microgame](../vendor/lemo-opuscar/styles/microgame/DEMO.md), [silent-film](../vendor/lemo-opuscar/styles/silent-film/DEMO.md) |

Use the selected style's sound palette. Neither the shared sampler nor the existing small procedural music engine supplies a finished score for an arbitrary story.

## Specialized data, media and review tools

The snapshot includes 250 files under demo tool directories. Adapt them inside a project, with its own assets and factual sources. Their source-specific assumptions are documented in the relevant STYLE.md/DEMO.md.

| Task | Source examples |
| --- | --- |
| Archive video search, logging, trims, scans and source records | Documentary `demo/tools/footage.py`, fetch/prep scripts and SOURCES.jsonl; [caption-news](../vendor/lemo-opuscar/styles/caption-news/DEMO.md), [visual-investigation](../vendor/lemo-opuscar/styles/visual-investigation/DEMO.md) |
| Time-lapse selection and rhythmic editing | [city-symphony](../vendor/lemo-opuscar/styles/city-symphony/DEMO.md): shots, timeline, footage, segment sheets, music and render tools |
| Sports analysis | [telestrator](../vendor/lemo-opuscar/styles/telestrator/DEMO.md): pitch geometry, homography, footage, cues and final checks |
| Satellite imagery and measurement | [satellite-briefing](../vendor/lemo-opuscar/styles/satellite-briefing/DEMO.md): Landsat/STAC, GIBS, plate normalization, masks, vector shorelines and growth maps |
| LiDAR and terrain | [lidar-survey](../vendor/lemo-opuscar/styles/lidar-survey/DEMO.md): EPT/NAIP acquisition, terrain, profiles, tracing and wall measurement |
| City models and projected evidence | [white-model](../vendor/lemo-opuscar/styles/white-model/DEMO.md): 3DBAG/BGT preparation, coordinates, city mesh, sun and projection shaders |
| CAD and electronics teardown | [teardown](../vendor/lemo-opuscar/styles/teardown/DEMO.md): CAD fetching, STEP-to-mesh, KiCad parsing, PCB extraction and texture generation |
| Microscopy | [microscope](../vendor/lemo-opuscar/styles/microscope/DEMO.md): slide pyramids, plate selection/registration, tissue masks and nucleus measurements |
| Archival document display | [archive-lighttable](../vendor/lemo-opuscar/styles/archive-lighttable/DEMO.md): SRU search, scan preparation and source-linked annotations |
| Detailed production checks | Demo cue/subtitle checks, final-mix ASR, mix/spectrum checks, motion/camera plots, resolution and hold checks; [briefing-board](../vendor/lemo-opuscar/styles/briefing-board/DEMO.md) is one broad example |

Other demo code contains reusable brushes, rigs, shaders, scene props and score techniques beyond `demo/tools/`; preserve those relationships when adapting an engine. A demo story, character or brand is not the user's new topic.

## Personal styles and visual reference collections

[MY-STYLES.md](../vendor/lemo-opuscar/MY-STYLES.md) covers changing a library style or starting from a blank page, identifying the style's invariants, writing a complete STYLE.md plus CHANGES.md and metadata, comparing the same frame with the base, producing a 15–30 second demonstration, and saving/revising the user's own library outside the package. It also covers discovering those styles by name and handling later changes to their base.

[styleboard/opuscar98_styles.json](../vendor/lemo-opuscar/styleboard/opuscar98_styles.json) adds **98 cinematic references**, with bilingual prompts, render modes, timings and shot descriptions across ten chapters. The [OPUSCAR 98 page](../vendor/lemo-opuscar/styleboard/opuscar98/index.html), associated stills and gallery templates are preserved. These are references, not 98 additional runnable style packages; the feature film's production source is not in this snapshot. The `thanks/` pages and images preserve further gallery examples, not extra production engines.

## Dependencies, assets and maintenance

The library retains 2,289 of the source checkout's 2,304 tracked files. The manifest records retained files and the 15 excluded files separately. All core tools, 59 styles and their demo sources, visual references, licenses and production guides remain. Git history and materials upstream did not commit are excluded.

- [TECHNIQUE.md §1](../vendor/lemo-opuscar/TECHNIQUE.md#1-requirements-and-install), `package-lock.json` and the four `requirements*.txt` files describe core, voice, music and instrument-index development dependencies. Style-specific packages belong in the project.
- [tools/assets.json](../vendor/lemo-opuscar/tools/assets.json) records seven downloadable packs with hashes; [tools/fetch.sh](../vendor/lemo-opuscar/tools/fetch.sh) implements acquisition. No voice models, instrument sample packs, HDRIs or finished demo videos are present locally. Demo fonts and raw data often need separate acquisition. `core/fonts/` contains only eight subsets, with limited Chinese coverage.
- [MAINTAINING.md](../vendor/lemo-opuscar/MAINTAINING.md) and [styles/_template](../vendor/lemo-opuscar/styles/_template/) explain adding a style, metadata, source/media checks and library demo gates. These are maintenance workflows, not requirements to modify the vendor tree for a user's film.
- [styleboard/build.py](../vendor/lemo-opuscar/styleboard/build.py) generates catalogs, gallery/README sections, the feature page and web metadata; `styleboard/frames.sh` creates gallery frames. Generated pages retain upstream branding and canonical links.
- `tools/release.py` remains for its style-completeness and reference-hygiene checks. Its upstream release actions are not part of ordinary film production.
- Upstream plugin/directory installers, nested skill entry points, marketplace metadata, GitHub Pages deployment and web publication scripts are omitted. This avoids duplicate skill registration and an unnecessary second installation. The importer preserves this exclusion policy.

Code/documentation licensing, demo-media attribution, third-party asset terms and the three excluded demo voice tracks are separated in [THIRD_PARTY.md](../THIRD_PARTY.md). Missing dependencies or assets must remain visible; a preserved source file is not proof that its whole pipeline was executed or that a new film meets an artistic benchmark.
