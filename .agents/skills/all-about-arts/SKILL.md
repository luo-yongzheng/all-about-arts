---
name: all-about-arts
description: Create and revise code-driven art films, explainers, data stories and product videos with distinctive visual styles, sound, subtitles and editable delivery. Use for a new film or changes to an all-about-arts project, including Chinese requests for 艺术短片、科普解说、数据叙事、产品影片. Not for unrelated programming or still-image-only tasks.
---

# all-about-arts

Make an original film about the user's topic. This package includes the complete pinned Lemo library: 59 style specifications, their demo source, posters, directing and production guides, audio tools and custom-style workflow. Huashu contributes the existing editing and revision tools. Use the bundled files; never depend on the downloaded checkout or automatically fetch `latest`.

## Start and route

1. Find this skill's absolute directory. Run `node <skill>/scripts/aaa.mjs doctor --json` and, for native production, `lemo doctor --json`. Use existing Chrome/Chromium and FFmpeg; no system installation or model download is implicit.
2. Read [director.md](references/director.md) for a new film. For an existing film, inspect its project files first: `lemo-project.json` / `index.html` indicate native production; `aaa.json` / `window.AAA` indicate the legacy Studio pipeline. Preserve its engine, intent and assets. For legacy projects also inspect the current report, `inbox` and `learn <project> list --json`.
3. Clarify only missing information that changes the film materially: audience, topic/factual source, delivery or indispensable assets. Honor style, silence, slow pacing, offline requirements and an existing visual language. Storyboard approval is a pause only when the user asks for it.
4. Run `styles [query] --json`, search in the user's language, and read the selected `native.style` path. Check the user's own style index at `~/lemo-my-styles/README.md` if present. Without a named style, suggest two or three distinct visual approaches that fit the subject, or choose when the user has delegated the choice. For the complete menu use [the 59-style index](vendor/lemo-opuscar/styles/README.md). The [98 cinema references](vendor/lemo-opuscar/styleboard/opuscar98_styles.json) are additional inspiration, not 98 runnable style packs.
5. When a visual comparison helps the user choose, show the candidate `native.poster` images, labelled as Lemo reference examples with source attribution. Explain their material, framing and motion differences; do not imply these reference images are newly generated for the user.

## Choose the production route

- **New film: prefer native authoring.** Read [native-lemo.md](references/native-lemo.md). `node <skill>/scripts/aaa.mjs lemo init <project> --style <slug>` accepts all 59 styles and creates an unfinished, editable page scaffold. Author the film with that style's actual drawing engine, materials, camera and sound grammar. It does not turn a prompt into a finished film or copy the demo story.
- **Existing Studio film or explicitly requested preset prototype:** keep `init`, `still`, `studio`, `render`, `export` and the eight reusable legacy renderers. Their status `integrated` means a preset exists. Their shared text-panel layouts and sample subjects are not the style's full expressive range. Do not select a style merely because it is one of these eight.
- **User-created style / real footage / specialized data:** follow the corresponding route in [lemo-capabilities.md](references/lemo-capabilities.md). Native pages can combine Canvas, WebGL, Three.js or edited material using `window.render(t)`; they are not restricted by the legacy eight-style configuration validator.

## Create

- Read the selected native `STYLE.md`, then write `TREATMENT.md` before opening `DEMO.md` or demo code. Include three candidate structures, the chosen arc, visual benchmark, framing/camera reasons, beat sheet, cue map and sound table. For documentary styles, the named material-gathering tools may be used before the treatment. Details and templates: [director.md](references/director.md).
- Once the treatment exists, read `vendor/lemo-opuscar/styles/<slug>/DEMO.md` and the specific `demo/` engines it names. Copy required techniques into the project, adapting paths and subjects. Full whiteboard Board/Camera/Pen and paper-lightbox shaders are available here; do not reduce them to connected boxes or festival lanterns just because the old wrapper did.
- Create films outside the skill. Native default: 1080p, 24 fps, 30–60 seconds; a style's frame-rate requirement and the user's brief take precedence. Legacy defaults remain 1080p/30 for compatibility; its schema is in [project.md](references/project.md).
- Prove the look with actual rendered frames: three different story moments, including the signature shot; for characters add expressions and action poses. Inspect one short motion test for the hardest action. Keep drawing, content and timeline separate. `render(t)` must survive direct and reverse seek without prior-frame state.
- A film has one principal drawing backend. If combining engines, render standard timed clips or transparent overlays before composition. Use `runtime/adapters/index.mjs` for legacy interfaces, then implement text and selection regions where the original engine lacks them.

## Sound, assets and revision

- For native work read [TECHNIQUE.md](vendor/lemo-opuscar/TECHNIQUE.md) and the selected style's sound palette: sampled instruments, physically modeled strings, foley, cue checks, speech recognition and two-pass mixing are bundled. Large samples and voice models are optional downloads, listed in [native-lemo.md](references/native-lemo.md). For legacy voice/word anchors/ducking use [audio.md](references/audio.md). Reuse authorized assets and existing recordings; silence remains a valid artistic choice.
- Read [assets.md](references/assets.md) for user assets and host-mediated generation. Missing assets require a relevant substitute or an explicit dependency report, not an unrelated generic subject. Preserve font coverage and the individual source licences in `CREDITS`.
- Voice timing precision must be reported: recognized, interpolated or estimated. No model means no claim of ASR. Silence is a valid artistic choice.
- For legacy projects use `studio <project>` for time/object/coordinate notes and [studio.md](references/studio.md) for snapshots. Native pages use their own build/render path; do not claim they automatically gain Studio, legacy checks or legacy export. Preserve a source snapshot before multi-file revisions and inspect the affected frames afterward.

## Verify and deliver

- Follow [quality.md](references/quality.md): timestamped contact sheet, action strips, full-speed audiovisual review, reading time, subject scale, visual continuity, style fidelity and originality against the demo. Fix observed issues, then recheck. Automated motion metrics do not certify artistic quality.
- Native: run the project's `build.sh`, native `readcheck`, and the review tools in [native-lemo.md](references/native-lemo.md). Deliver film, poster, applicable SRT, treatment, credits, review evidence and editable source with a reproducible build. Missing optional checks remain `not-checked`; missing required assets or render errors block delivery.
- Legacy: run `render <project> --json`, inspect `out/check.json`, then `export <project>` for video, cover, applicable subtitles, report and editable toolkit. Export rebuilds stale outputs and preserves earlier deliveries. Neither route is artistically certified by an agent's own score.
- For legacy projects follow [evolution.md](references/evolution.md) and `learn` to record and reuse verified evidence. For native projects keep findings and frame evidence in REVIEW.md. User preferences and project files stay out of the public skill. Shared improvements require actual source changes and relevant verification; recording a lesson alone does not upgrade the engine.

For commands, installation and recovery use [tools.md](references/tools.md); for the full imported capability map use [lemo-capabilities.md](references/lemo-capabilities.md). Upstream setup scripts are preserved as reference: do not run their clone/update step in this installed skill. Runtime uses the pinned local bundle. Publishing or spending on external services requires authorization from the task.
