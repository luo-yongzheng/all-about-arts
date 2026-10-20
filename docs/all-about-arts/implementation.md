# Implementation ledger

Scope: implement the user-approved all-about-arts plan in this repository. Following the user's 2026-10-20 simplification request, upstream checkouts, source-lock maintenance and original-renderer baseline tests are retired. The package is maintained independently. Work is on `codex/all-about-arts`.

## Shared interfaces

The distributable is `skills/all-about-arts/` (ES modules, Node >=22). Public CLI: `node scripts/aaa.mjs COMMAND [project] [--key value] [--json]`. Dependencies are version-locked. All generated user projects are outside this package.

Project configuration (`aaa.json`, schemaVersion 1):
```json
{"schemaVersion":1,"title":"A new film","style":"pixel-rpg","width":1920,"height":1080,"fps":30,"duration":18,"seed":42,"genre":"art","content":{"title":"A new film","subtitle":"","items":[{"label":"First","value":30},{"label":"Second","value":70}]},"scenes":[{"id":"opening","start":0,"end":6,"title":"A new film","body":"","kind":"establish"},{"id":"development","start":6,"end":12,"title":"Change","body":"","kind":"develop"},{"id":"ending","start":12,"end":18,"title":"A new possibility","body":"","kind":"resolve"}],"audio":{"music":{"enabled":false},"sfx":[],"voice":null},"assets":[]}
```

Project files: `index.html`, `film.mjs`, `aaa.json`, `assets/`, `.aaa/runtime/` (copied portable runtime including styles), `.aaa/state/` (history, inbox, audio cache), `out/` (generated deliverables). Source fingerprint includes config, source, assets, runtime and tool/package versions; excludes output and state. User `film.mjs` is editable. It imports `createFilm` from `./.aaa/runtime/film.mjs`, loads config, assigns `window.AAA = await createFilm(canvas, config)`.

Browser API: `ready` Promise or true; `describe()` returns width, height, fps, duration, scenes, parameters (array of `{key,label,type,value,min?,max?}`); `render(t)` async allowed; `texts(t)` and `regions(t)` return arrays of `{id,scene,text?,x,y,width,height,critical?}` in project pixels. Direct and reverse seek must be deterministic. No wall clock or unseeded random in drawing. Portrait layouts are designed separately.

Module ownership:
- Root: package, CLI, project/config validation, assets, browser/server, renderer, delivery/check, installation, skill/docs, integration/acceptance tests.
- Styles agent: `runtime/**`, `styles/**`, style-focused tests, `references/styles/**`, provenance fragment `styles/upstreams.json`. API above. Root installs dependencies; runtime vendor files may be copied from verified upstream MIT code with provenance.
- Audio agent: `lib/audio.mjs`, `lib/voice.mjs`, `lib/timeline.mjs`, `scripts/voice-local.py`, audio/timeline tests. Export `resolveTimeline(config, words=[])`; `buildAudio(project, config, {force=false}={})` -> `{status,path|null,subtitles|null,words:[],fingerprint,...}`; `importVoice(project,{file,script,segments?,words?})`; `generateVoice(project,{script,provider,...})`. Audio config persisted as `{voice:{file,script,segments?,words?,precision}, music:{enabled,volume?}, sfx:[]}`. Shared timeline in seconds, files project-relative. No silently inferred ASR precision. Core runs FFmpeg via argument arrays. Independent cache hashing.
- Studio agent: `studio/**`, `lib/history.mjs`, `lib/inbox.mjs`, history/inbox tests. `snapshot(project,{message}={})`, `undo(project,{id}={})`, `history(project)`; `listInbox(project)`, `addNote(project,note)`, `updateNote(project,id,status)` (`open/in_progress/done`). Snapshot multiple source/config files; assets referenced by content hash. Studio frontend uses `/api/project`, `/api/notes`, `/api/history`, `/api/save` (config + expected hash), `/api/undo`, `/api/render`, `/api/export`; receives `{config,fingerprint}`; film iframe `/film/`; all API calls same-origin. Root owns HTTP server and routes.

## Progress and decisions

- Implementation is present in the distributable package. See acceptance.md for measured results and outstanding release gates. Historical import attribution and licenses stay in the package; the three original repositories are removed after independent execution checks.
- Initial decision: work in a new branch in the current workspace while importing the three untracked reference checkouts. Those checkouts are no longer part of the workflow.
- Experience can be recorded, retrieved with current evidence checks and explicitly reused across projects with copied evidence. The agent-driven shared improvement workflow is in references/evolution.md; it does not train weights or automatically promote private preferences.
- Certification requires evidence; catalog records reference/integrated/certified separately. No style is marked certified merely because its adapter exists.
