# Evidence and delivery

Technical checks inspect asset presence/hash, page errors, sampled registered Canvas/WebGL and DOM text bounds, sequential versus reverse-seek frames, encoded frame count/size/rate/duration and audio presence. Encode/decode failures are fatal. Checks are tied to source and tool hashes. `export` rejects stale reports and modified output files, and normally rebuilds stale work.

Sampling is not exhaustive. Add samples at tightly timed text transitions, camera cuts, collisions or media boundaries when a scene needs them. Custom backends without `texts` report that inspection as `not-checked`; do not describe the canvas as checked. Default checks cannot verify factual claims, pronunciation, complete subtitle transcription, plot coherence or art direction.

Creative review should cite an image or a time, such as “at 07.2 seconds the chart labels overlap,” followed by a specific correction. Inspect full-size text, negative space, shot meaning, material detail and sound/visual relationships. Motion analysis measures sampled frame differences and identifies holds/cuts for review; quiet frames and any color palette remain valid choices.

Each integrated style has two new-topic fixtures. Automated renderability, deterministic seek and output checks prove technical integration; style certification also needs independent visual/story/sound/revision evidence. Catalog `integrated` must not be presented as `certified`. The repository acceptance runner records actual checks; unperformed host or comparison evaluations stay unperformed.

The deliverable includes the editable project and toolkit plus a manifest of hashes. FFmpeg and a compatible installed browser are host prerequisites; video rendering is offline. Device/GPU/font differences can affect pixels, so cross-platform byte identity is not promised.
