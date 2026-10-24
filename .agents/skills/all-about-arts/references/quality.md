# Evidence and delivery

## Review both production routes

For each new film keep `REVIEW.md` with concrete times, frame paths, observed issues, fixes and recheck results. Inspect these dimensions independently:

| Dimension | Evidence |
| --- | --- |
| Topic and story | Each shot advances this topic; opening, turn and ending have visible consequences. Check factual claims against FACTS.md. |
| Style fidelity | Compare three actual story frames with STYLE.md and its poster: material, depth, camera, typography and motion, not only colour. |
| Composition | Subject and important action are readable at output size; no irrelevant stock subject or repeated panel imposed by a starter. |
| Performance | Contact sheet across the whole film and 0.2-second strips around key actions; check limb/prop continuity and transitions. |
| Text | Inspect exact text at final size; verify glyphs, safe areas, contrast, reading holds and subtitle placement. |
| Sound and pacing | Full-speed viewing with sound; compare cue map to actions, speech intelligibility, foley material and dynamics. Explicitly mark this unrun if playback/listening is unavailable. |
| Originality | Compare structure, opening, signature shot, camera path, score shape and ending with the demo; preserve medium, invent the topic's film. |

Fix observed failures, then repeat the affected checks. Keep a deliberate quiet shot or silence when the treatment calls for it. A completed encode cannot pass the story/style/sound review on its own.

Native pages use the [native review/build tools](native-lemo.md), including `lemo readcheck`, event export, contact sheets, audio checks and final FFmpeg/ffprobe inspection. Native tools are imported source, not a promise that all original demos have been re-rendered. `readcheck` depends on complete `window.TEXTS` registration; empty or missing registration cannot establish that on-screen text was checked. Native builds do not receive a legacy `out/check.json` automatically.

## Legacy Studio checks

Technical checks inspect asset presence/hash, page errors, sampled registered Canvas/WebGL and DOM text bounds, sequential versus reverse-seek frames, encoded frame count/size/rate/duration and audio presence. Encode/decode failures are fatal. Checks are tied to source and tool hashes. `export` rejects stale reports and modified output files, and normally rebuilds stale work.

Sampling is not exhaustive. Add samples at tightly timed text transitions, camera cuts, collisions or media boundaries when a scene needs them. Custom backends without `texts` report that inspection as `not-checked`; do not describe the canvas as checked. Default checks cannot verify factual claims, pronunciation, complete subtitle transcription, plot coherence or art direction.

Creative review should cite an image or a time, such as “at 07.2 seconds the chart labels overlap,” followed by a specific correction. Inspect full-size text, negative space, shot meaning, material detail and sound/visual relationships. Motion analysis measures sampled frame differences and identifies holds/cuts for review; quiet frames and any color palette remain valid choices.

Each integrated style has two new-topic fixtures. Automated renderability, deterministic seek and output checks prove technical integration; style certification also needs independent visual/story/sound/revision evidence. Catalog `integrated` must not be presented as `certified`. The repository acceptance runner records actual checks; unperformed host or comparison evaluations stay unperformed.

The deliverable includes the editable project and toolkit plus a manifest of hashes. FFmpeg and a compatible installed browser are host prerequisites; video rendering is offline. Device/GPU/font differences can affect pixels, so cross-platform byte identity is not promised.
