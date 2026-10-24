# Sources and attribution

Historical import attribution is recorded in [provenance/integration-history.json](provenance/integration-history.json): original repositories, commits, source hashes and adaptation relationships. It describes the initial extracted/adapted code, not the scope of the later complete Lemo snapshot. Keep the original copyright and license notices when changing imported code.

The [vendor/lemo-opuscar](vendor/lemo-opuscar/) production library comes from the user-supplied local checkout at commit `3961ddb3d24d8876e0e2754f7790d66908acee51`. [provenance/lemo-snapshot.json](provenance/lemo-snapshot.json) records 2,289 retained files and 15 excluded upstream installer/publishing files, including their original paths, sizes and SHA-256 hashes. The original checkout contained 2,304 tracked files. Five `.gitignore` files are stored as `.gitignore.upstream`; retained file contents are unchanged. Git history and ignored/download-only resources are not included. This is an active runtime and reference dependency; the original download and an automatic upstream refresh are not required.

| Source | License | Contribution |
| --- | --- | --- |
| LemoLab / lemo-opuscar code and documentation | MIT, [licenses/lemo-opuscar.txt](licenses/lemo-opuscar.txt) and [vendored LICENSE](vendor/lemo-opuscar/LICENSE) | Original adapted techniques plus the full guides, 59 styles and demo source trees, core tools, personal-style workflow, gallery and maintenance tooling |
| alchaincyf / huashu-art-motion | MIT, licenses/huashu-art-motion.txt | Seeded procedural drawing, brush/texture/camera techniques and motion-analysis approach |
| Huashu / huashu-motion | MIT, licenses/huashu-motion.txt | Word anchors, score/ducking, object-time annotations, optimistic editing and revision/delivery workflow |
| Three.js 0.170.0 | MIT, licenses/three.txt | Physical glass rendering; bundled unmodified browser module |
| Playwright core 1.63.0 | Apache-2.0, installed dependency LICENSE/NOTICE | Browser control; locked by package-lock.json |

New integration, project tools and starter compositions are under the package MIT license. Imported reference guides retain their upstream provenance. The Huashu imports and their historical records remain in place. The Lemo snapshot's 98 OPUSCAR cinematic references are a separate reference collection, not 98 additional implemented styles; the feature film's production source is not included upstream.

## Media and asset licenses

The MIT code license does not relicense the bundled pictures or external media. The [upstream README license section](vendor/lemo-opuscar/README.md#licence) distinguishes them:

| Material | Terms and record |
| --- | --- |
| Demo films and their stills in styles, gallery and releases | CC BY 4.0: credit LemoLab, link to the upstream repository and indicate changes. Bundled posters, style frames and gallery images retain this distinction from code. Finished demo videos are not included in this local snapshot. |
| Fonts | SIL Open Font License where specified; see [core/fonts/OFL.md](vendor/lemo-opuscar/core/fonts/OFL.md) and each demo's CREDITS. Only eight common WOFF2 subsets are bundled; many demo fonts are external. |
| Poly Haven models and textures | CC0; see [core/assets/polyhaven/SOURCES.md](vendor/lemo-opuscar/core/assets/polyhaven/SOURCES.md). Some models/textures are bundled; the listed HDRIs are external. |
| Instrument samples, music, images, scans, footage, data and other demo assets | Keep their own licenses. See [core/audio/INSTRUMENTS.md](vendor/lemo-opuscar/core/audio/INSTRUMENTS.md), each demo's CREDITS and SOURCES/FACTS records. Source URLs and fetch scripts do not mean the asset file is bundled. |

Three demo voice tracks are explicitly excluded from the demo CC BY 4.0 grant: [Game Show Flat](vendor/lemo-opuscar/styles/game-show/demo/CREDITS) uses macOS system voices, [Paper-cut Lightbox](vendor/lemo-opuscar/styles/paper-lantern/demo/CREDITS) uses Microsoft Edge TTS, and [Broadcast News Package](vendor/lemo-opuscar/styles/news-package/demo/CREDITS) uses Doubao TTS under Volcengine's terms. Do not reuse those tracks under the demo license. Their synthesis code and attribution records do not grant rights to the generated voice audio.

[tools/assets.json](vendor/lemo-opuscar/tools/assets.json) records seven external packs with hashes and sizes, totaling 1,787,770,880 bytes; it is an acquisition manifest, not bundled media. Voice models, instrument samples, HDRIs, raw footage/scans and other omitted assets need separate availability and license checks for the particular project.

User films do not require a LemoLab sign-off or watermark. Preserve applicable attribution for third-party assets actually used in the film's CREDITS. User assets and generated media retain their own recorded terms; neither the package license nor inclusion of a demo's acquisition script grants additional rights.
