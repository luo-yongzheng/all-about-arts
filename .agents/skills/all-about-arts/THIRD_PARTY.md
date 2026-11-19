# Sources and attribution

Historical import attribution is recorded in [provenance/integration-history.json](provenance/integration-history.json): original repositories, commits, source hashes and adaptation relationships. It describes the initial extracted/adapted code, not the scope of the later complete Lemo snapshot. Keep the original copyright and license notices when changing imported code.

The [vendor/lemo-opuscar](vendor/lemo-opuscar/) production library is Lemo-Opuscar 2.0.x from a clean local checkout at commit `00a7f9ec99c8686265a8ca4ed9a3fdaaf27ea6f4` (2026-11-17). [provenance/lemo-snapshot.json](provenance/lemo-snapshot.json) records 3,922 retained files and 20 excluded upstream installer/publishing files, including their original paths, sizes and SHA-256 hashes. The original checkout contained 3,942 tracked files. Six `.gitignore` files are stored as `.gitignore.upstream`; retained file contents are unchanged, and the host repository's `.gitattributes` keeps them byte-exact. Git history and ignored/download-only resources are not included. This is an active runtime and reference dependency; the original download and an automatic upstream refresh are not required. The previous snapshot (`3961ddb`, 59 styles, MIT) is preserved in this repository's Git history (vendored JPEGs are git-ignored).

**Licence change in Lemo-Opuscar 2.0.0.** The upstream [LICENSE](vendor/lemo-opuscar/LICENSE) (copy: [licenses/lemo-opuscar-2.0.txt](licenses/lemo-opuscar-2.0.txt), full texts in [vendor/lemo-opuscar/LICENSES](vendor/lemo-opuscar/LICENSES/), file-by-file rules in [REUSE.toml](vendor/lemo-opuscar/REUSE.toml)) is the governing rule document for the vendored library. This repository's root MIT `LICENSE` does **not** cover the vendored Lemo docs, films, stills or third-party material.

| Lemo-Opuscar 2.0 material | Licence |
| --- | --- |
| Code: `core/`, `tools/`, `styleboard/` and each demo's code, data, configuration, CREDITS and small assets | MIT |
| Docs: every Markdown file (DIRECTOR.md, TECHNIQUE.md, MY-STYLES.md, each STYLE.md and DEMO.md, READMEs) and the image-generation prompts; this includes the copies in [references/styles](references/styles/) | CC BY-NC 4.0, plus Lemomo's additional permission to read, follow, copy and adapt them to make your own films (commercial and client films included) and to include them in that film's delivered project files. Other commercial use of the docs needs a commercial licence from Lemomo. |
| Demo films, subtitles, posters, stills, `docs/` and `styleboard/img/` pictures | CC BY 4.0, except third-party material named in each demo's CREDITS / REUSE.toml |
| Clawd character, third-party interfaces, names and trademarks | Not licensed (`LicenseRef-Clawd`, `LicenseRef-ThirdPartyMarks`) |

Credit as "Lemo-Opuscar by Lemomo (LemoLab)" with a link to https://github.com/lemomo-ai/lemo-opuscar, the licence name and link, and whether it was changed. Two styles are contributed: "Memphis Diorama by EianLu, in Lemo-Opuscar by Lemomo (LemoLab)" and "Crayon World 3D by 2nd1st, in Lemo-Opuscar by Lemomo (LemoLab)". Films users make with the library are theirs and need no credit; third-party material in them keeps its own terms.

| Source | License | Contribution |
| --- | --- | --- |
| LemoLab / lemo-opuscar, pre-2.0 commits (initial adapted code in `runtime/upstream`, legacy renderers) | MIT, [licenses/lemo-opuscar.txt](licenses/lemo-opuscar.txt); earlier versions keep the licence they were published under | Original adapted techniques for the eight legacy renderers |
| Lemo-Opuscar 2.0.x vendored library | Mixed, see above and [licenses/lemo-opuscar-2.0.txt](licenses/lemo-opuscar-2.0.txt) | Full guides, 99 styles and demo source trees, core tools, image-generation route, personal-style workflow, gallery and maintenance tooling |
| alchaincyf / huashu-art-motion | MIT, licenses/huashu-art-motion.txt | Seeded procedural drawing, brush/texture/camera techniques and motion-analysis approach |
| Huashu / huashu-motion | MIT, licenses/huashu-motion.txt | Word anchors, score/ducking, object-time annotations, optimistic editing and revision/delivery workflow |
| Three.js 0.170.0 | MIT, licenses/three.txt | Physical glass rendering; bundled unmodified browser module |
| Playwright core 1.63.0 | Apache-2.0, installed dependency LICENSE/NOTICE | Browser control; locked by package-lock.json |

New integration, project tools and starter compositions are under the package MIT license. Imported reference guides retain their upstream provenance. The Huashu imports and their historical records remain in place. The Lemo snapshot's 98 OPUSCAR cinematic references are a separate reference collection, not 98 additional implemented styles; the feature film's production source is not included upstream.

## Media and asset licenses

Neither MIT licence relicenses the bundled pictures or external media. The upstream [LICENSE](vendor/lemo-opuscar/LICENSE) and [README licence section](vendor/lemo-opuscar/README.md#licence) distinguish them:

| Material | Terms and record |
| --- | --- |
| Demo films and their stills in styles, gallery and releases | CC BY 4.0: credit Lemo-Opuscar by Lemomo (LemoLab), link to the upstream repository and indicate changes. Bundled posters, style frames and gallery images retain this distinction from code. Finished demo videos are not included in this local snapshot. |
| Fonts | SIL Open Font License where specified; see [core/fonts/OFL.md](vendor/lemo-opuscar/core/fonts/OFL.md) and each demo's CREDITS. Only eight common WOFF2 subsets are bundled; many demo fonts are external. |
| Poly Haven models and textures | CC0; see [core/assets/polyhaven/SOURCES.md](vendor/lemo-opuscar/core/assets/polyhaven/SOURCES.md). Some models/textures are bundled; the listed HDRIs are external. |
| Instrument samples, music, images, scans, footage, data and other demo assets | Keep their own licenses. See [core/audio/INSTRUMENTS.md](vendor/lemo-opuscar/core/audio/INSTRUMENTS.md), each demo's CREDITS and SOURCES/FACTS records. Source URLs and fetch scripts do not mean the asset file is bundled. |

Six demo voice tracks are excluded from the demo CC BY 4.0 grant and from any licence: the narration of [Chalkboard](vendor/lemo-opuscar/styles/chalkboard/demo/CREDITS), [Circuit Board](vendor/lemo-opuscar/styles/circuit-board/demo/CREDITS), [Tabletop App Flythrough](vendor/lemo-opuscar/styles/desktop-flythrough/demo/CREDITS), [Isometric People Scene](vendor/lemo-opuscar/styles/isometric-picture-book/demo/CREDITS) and [Scratchboard Long Take](vendor/lemo-opuscar/styles/printed-long-take/demo/CREDITS) (Microsoft Edge TTS), and of [Broadcast News Package](vendor/lemo-opuscar/styles/news-package/demo/CREDITS) (Doubao TTS under Volcengine's terms). Do not extract or reuse those tracks. Their synthesis code and attribution records do not grant rights to the generated voice audio.

[tools/assets.json](vendor/lemo-opuscar/tools/assets.json) records seven external packs with hashes and sizes, totaling 1,787,770,880 bytes; it is an acquisition manifest, not bundled media. Voice models, instrument samples, HDRIs, raw footage/scans and other omitted assets need separate availability and license checks for the particular project.

User films do not require a LemoLab sign-off or watermark. Preserve applicable attribution for third-party assets actually used in the film's CREDITS. User assets and generated media retain their own recorded terms; neither the package license nor inclusion of a demo's acquisition script grants additional rights.
