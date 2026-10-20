# Project and runtime contract

`aaa.json` is the editable source of truth (schemaVersion 1). Fields: title, style, width/height (even integers), fps, duration (an integer frame count at fps), seed, genre, content, scenes, audio, assets. Supported integrated style IDs are listed by `aaa styles`. Width greater than height selects landscape; portrait uses a designed layout rather than cropping.

`content`: title, subtitle and items `[{label,value}]`; `image` may name a project-relative asset. Each `scene` has a stable id, start/end seconds, title/body and kind. Additional drawing parameters belong in content or individual scenes, not hidden copies of global timing. The sound reference describes word anchors.

Every scene uses absolute time. Required browser interface on `window.AAA`:

```js
{
  ready: Promise.resolve(),
  describe: () => ({width, height, fps, duration, scenes, parameters}),
  render: async t => { /* draw the complete frame at t */ },
  texts: t => [{id, scene, text, x, y, width, height, critical: true}],
  regions: t => [{id, scene, x, y, width, height}]
}
```

Coordinates are in output pixels. Text bounds must cover the actual glyphs, including wrapping. Parameters are `{key,label,type,value,min?,max?}`; keys are configuration paths. `render(t)` is awaited by preview and capture. No wall-clock-based physics, mutable random stream consumed across frames or deferred drawing after render resolves. For media, finish seeking/loading before resolving.

Local source: index.html, film.mjs and `.aaa/runtime/`. The runtime copy belongs to the film and can be edited independently. `assets/` contains hash-addressed imports. `.aaa/state/` contains history, notes and derived audio. `out/` contains outputs. Neither state nor outputs define source validity; hashes include source, assets, runtime and tool code.

The starter film uses `window.__AAA_CONFIG` when the renderer supplies a resolved timeline; otherwise it loads aaa.json. Preserve this when adding source modules. Legacy adapters normalize existing Lemo/Motion/Art entrypoints; they do not magically provide missing text bounds or make a stateful animation deterministic.

For alpha set `transparent: true` and render `--format mov` (ProRes 4444) or `--format webm`. MP4 cannot preserve alpha. A style's intentional backdrop may remain opaque; inspect the exported channel. For cross-backend composition import a pre-rendered clip as a project asset, with its exact frame rate and duration, and await deterministic media preparation in your custom render function.
