---
name: all-about-arts
description: Create and revise code-driven art films, explainers, data stories and product videos with distinctive visual styles, sound, subtitles and editable delivery. Use for a new film or changes to an all-about-arts project, including Chinese requests for 艺术短片、科普解说、数据叙事、产品影片. Not for unrelated programming or still-image-only tasks.
---

# all-about-arts

Make a film that expresses this user's topic. Lemo supplies the creative backbone and specialized rendering techniques; Huashu contributes procedural art and a practical revision loop. The package is self-contained. Use the scripts beside this file; never assume an upstream checkout or install `latest`.

## Start and route

1. Find this skill's absolute directory. Run `node <skill>/scripts/aaa.mjs doctor --json`. Use existing Chrome/Chromium and FFmpeg; no system installation or model download is implicit.
2. Read [director.md](references/director.md) for a new film. For an existing film, read its `aaa.json`, `film.mjs`, current report, `inbox` and `learn <project> list --json` first. Preserve its intent and assets. Apply a lesson only when its evidence is current and its context fits this task.
3. Clarify only missing information that changes the film materially: audience, topic/factual source, delivery or indispensable assets. Honor style, silence, slow pacing, offline requirements and an existing visual language. Storyboard approval is a pause only when the user asks for it.
4. Run `styles [query] --json`. All 51 Lemo directions have references; only integrated packs can be initialized directly. Catalog status is evidence, not a quality score. Do not claim reference-only styles already work end to end.

## Create

- Before consulting a demo, write a topic-specific treatment and shot plan. Choose what changes on screen and why. Use references for medium/lighting/motion techniques, not a demo's story with replacement labels.
- For the selected direction read its `references/styles/<slug>/STYLE.md`, then the corresponding `runtime/styles/<slug>.mjs` when adapting technique. Read [project.md](references/project.md) for the project schema and runtime contract.
- Create a new project outside the skill: `node <skill>/scripts/aaa.mjs init <project> --style <slug> --title <title>`. Default 1080p/30; `--portrait` creates a separate portrait composition. Configure `aaa.json`, then edit `film.mjs` or its local `.aaa/runtime` for original storytelling. An initializer is a starting point, not the finished creative assignment.
- Build the hardest meaningful shot first and inspect an actual `still`. Keep drawing, content and timeline separate. `render(t)` must survive direct and reverse seek; seeded procedural drawing should not depend on prior frames.
- A film has one principal drawing backend. If combining engines, render standard timed clips or transparent overlays before composition. Use `runtime/adapters/index.mjs` for legacy interfaces, then implement text and selection regions where the original engine lacks them.

## Sound, assets and revision

- Read [audio.md](references/audio.md) for voice import/generation, word anchors, score and ducking. Read [assets.md](references/assets.md) for user assets and host-mediated generation. Reuse unchanged generated assets and the user's existing authorization/budget. Missing generators are not permission to replace the user's subject with generic stock.
- Voice timing precision must be reported: recognized, interpolated or estimated. No model means no claim of ASR. Silence is a valid artistic choice.
- Use `studio <project>` for local preview and time/object/coordinate notes. Read [studio.md](references/studio.md) for note state and snapshots. Before multi-file manual edits run `snapshot`; after edits inspect the affected frames and resolve only addressed notes. CLI and Studio use the same render/export pipeline.

## Verify and deliver

- Run `render <project> --json`, then inspect the film and `out/check.json`. Technical failures block delivery. Unrun checks remain `not-checked`. Automated movement/color/readability observations are advice; they do not certify artistic quality or factual correctness.
- Inspect meaningful moments and transitions, text at full output size, voice alignment and the effect of requested revisions. See [quality.md](references/quality.md). Never turn a quiet film into rapid motion merely to satisfy a metric.
- Use `export <project>` to deliver video, cover, applicable subtitles, current report and editable source/toolkit. It rebuilds stale outputs and preserves prior delivery directories. Report what was tested and any actual limitation; do not claim superiority or “certified” from an agent's own score.
- Follow [evolution.md](references/evolution.md) to record outcomes, retrieve lessons, reuse verified evidence across projects and improve the shared tools. `learn` separates preferences, observations and verified lessons; changed or missing evidence prevents reuse. User preferences and project files stay out of this skill's public distribution. Shared improvements require an actual source change and relevant verification; recording a lesson alone does not upgrade the engine.

For CLI details, installation and recovery use [tools.md](references/tools.md). Core generation/rendering works offline once its local dependencies and assets exist. Publishing, uploading or spending on external services needs authorization from the task; installing this skill grants none.
