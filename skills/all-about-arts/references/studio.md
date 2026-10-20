# Local Studio

Run `node scripts/aaa.mjs studio /absolute/path/to/film` from the skill package. The local server binds to loopback and opens a workspace around the real film. Studio uses the project’s `window.AAA` interface through the same-origin `/film/` iframe. It does not depend on an upstream player, timeline global, or project format.

## Working in Studio

- Select a scene, drag the playhead, use the play button or Space, and step a frame with the arrow keys. The film receives explicit times; asynchronous renders are serialized so older frames cannot overwrite newer ones.
- Change the parameters declared by `AAA.describe().parameters`. Save applies the configuration and reloads the preview. Save includes the last source fingerprint; an external change produces a conflict while retaining the unsaved draft. **Reload project** discards the local draft and reads the current files.
- Choose **Add note**, then click a detail. The smallest registered `AAA.regions(t)` rectangle under the pointer becomes the object anchor. If the film has no matching region, the note retains its project-pixel coordinates. Every note stores `t`, `x`, `y`, `scene`, `objectId`, and `text`. The frame target is keyboard-focusable; Enter chooses its center.
- Notes can be **Open**, **In progress**, or **Done**. Selecting a note’s location returns the preview to its time. Notes remain separate from source history. While the tab is visible, note statuses and history refresh every three seconds so agent updates appear without reloading the film.
- **Undo last save** restores the most recent unconsumed snapshot. The History panel can restore a specific saved version. Save pending parameter changes, or reload them from disk, before restoring a version or generating an output.
- **Render film** and **Export package** call the same production endpoints as the command-line workflow and show the resulting output path. The preview plays the prepared mix of voice, music, and effects. The audio clock drives visual playback; seeks and pauses affect both. Silent projects have no audio source.

## Browser contract

The iframe exposes `window.AAA` with `ready`, `describe()`, `render(t)`, and `regions(t)`. `describe()` must include positive `width`, `height`, `fps`, and `duration`, along with `scenes` and a `parameters` array. Text registration remains available to validation through `texts(t)`; the Studio anchor picker uses object regions. Portrait and landscape previews preserve the film’s native viewport size and aspect ratio.

Parameter keys are existing dot-separated configuration paths, including numeric array indices such as `scenes.0.title`. Prototype-related keys and undeclared paths are rejected. Number, integer, boolean, text, multiline text, color, and select controls are supported. Optional numeric bounds come from the film declaration. Validation errors keep the previous valid draft and disable saving until corrected.

## HTTP integration

`studio/index.html` loads `/studio.js` and `/studio.css`; the root-owned server serves all three. Requests are relative to the current origin and carry same-origin credentials.

| Endpoint | Request | Response used by Studio |
| --- | --- | --- |
| `POST /api/prepare` | `{}` | `{status,config,fingerprint,audio:{url,precision}}` |
| `GET /api/project` | — | `{config, fingerprint}` |
| `GET /api/notes` | — | Notes array, or `{notes}` |
| `POST /api/notes` | `{t,x,y,scene,objectId,text}` | New note / success |
| `PATCH /api/notes/:id` | `{status}` | Updated note / success |
| `GET /api/history` | — | History array, or `{history}` |
| `POST /api/save` | `{config,expectedFingerprint}` | Success; Studio rereads project |
| `POST /api/undo` | `{id?}` | Success; Studio rereads project |
| `POST /api/render` | `{}` | `{status,path?,url?}` |
| `POST /api/export` | `{}` | `{status,path?,url?}` |

Preparation resolves timing and the existing soundtrack mix. It does not generate speech or call a voice provider. Studio loads the same-origin audio URL and retains the raw project configuration for parameter edits, preserving authored word anchors.

Failures use a non-success HTTP status and/or `{status:"failure",error:{message}}`. Studio displays the message without interpreting it as HTML. Result links must resolve to the same origin. Server-side origin, host, file access, optimistic-save locking, and output validation are enforced by the server and production modules.

## Durable notes

`lib/inbox.mjs` exports async `listInbox(project)`, `addNote(project,input)`, and `updateNote(project,id,status)`. The project argument is an absolute directory path. Notes are stored in `.aaa/state/inbox.json` with schema version 1. Writes acquire an exclusive filesystem lock, write and sync a temporary file, then rename it atomically. Independent CLI/server processes share the same lock. Readers see a complete prior or current version.

Inputs require finite nonnegative numeric time and coordinates, nonempty text up to 10,000 characters, and string-or-null scene/object identifiers up to 256 characters. Unknown input fields are rejected. Statuses are exactly `open`, `in_progress`, and `done`; clients cannot set the ID, timestamps, or initial status. Malformed persisted data fails visibly and is never replaced with an empty inbox.

## Source history

`lib/history.mjs` exports async `snapshot(project,{message}={})`, `history(project)`, and `undo(project,{id}={})`. The server calls `snapshot` **before** changing configuration. `history` returns newest-first summaries containing `id`, `createdAt`, `message`, `fingerprint`, `fileCount`, and optional `restoredAt`. `undo` returns the restored summary. Default undo marks the newest unconsumed snapshot restored; repeated calls walk backward. Explicit IDs remain restorable.

Snapshots include project source, configuration, assets, editable `.aaa/runtime` modules, and other project toolchain files. They exclude `.aaa/state`, `out`, `node_modules`, and `.git`. Binary contents are stored once by SHA-256 under `.aaa/state/history/blobs/`; an atomic index retains each version’s relative paths, hashes, sizes, and file modes. Runtime files are included because they are editable parts of generated user projects.

Restoration validates manifest paths and verifies all blob hashes before changing source. It restores edited/deleted files, removes source files absent from the chosen snapshot, and preserves excluded outputs/state. File/directory shape changes are supported; a conflicting preserved output directory is rejected before any source deletion. Source or state symlinks are rejected rather than followed. Files are replaced atomically one at a time; this is not a filesystem-wide transaction against power loss or unrelated external writers. The root server serializes save/undo/build operations separately.

Both storage modules use `lib/studio-state.mjs`. A lock is never stolen from a potentially live writer. If a writer crashes, a later operation reports a timeout and names the lock file; after confirming that process stopped, remove that lock and retry. Storage failures expose `statusCode` for HTTP callers.

## Provenance and verification

The conceptual reference is Huashu Motion’s point-at-frame editor and agent inbox. Studio, history, and note storage are new implementations of the independent all-about-arts contracts; no OM player or globals are retained. See `../studio-upstreams.json` for pinned reference provenance and the package’s Huashu Motion license notice.

Tests cover real temporary paths containing spaces and Unicode, source/assets/runtime restoration, content deduplication, repeated and explicit undo, tampered blobs and manifests, symlink refusal, output preservation, concurrent snapshots, three independent note-writing processes, strict note validation, parameter path safety, coordinate mapping, and a real-browser Studio flow including conflicting saves, real WAV playback/seek/pause, silent reload, and externally updated note status. A second browser test uses the real runtime, production server, and soundtrack preparation to verify visible scene-title edits and synchronized playback.
