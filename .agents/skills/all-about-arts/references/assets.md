# Asset provenance and host capabilities

The commands below register assets in legacy `aaa.json` projects. For native Lemo pages, keep the same provenance and hash records in the project's asset manifest/CREDITS and use project-relative page imports; `aaa assets` does not operate on `lemo-project.json`. Read [native-lemo.md](native-lemo.md) for font, model and sample dependencies.

Import local media with `assets <project> import --file <file> --id <id> --source user --license user-provided`. The bytes are copied under their SHA-256 and registered in aaa.json. Hash mismatch and missing required assets block rendering. Preserve actual terms and attribution for third-party material; `user-provided` records origin, not an invented license grant.

Use `assets <project> request --kind image --prompt "..."` to obtain a stable generation request. If an unchanged request already has a valid receipt the command reuses it. Otherwise use an available host image/audio tool or configured service within the user's existing authorization and budget. This command does not contact a service. Finish with `assets <project> receipt --request <id> --file <result> --provider <provider> --license <terms>`.

Receipts are agent-reported provenance, not cryptographic provider attestation. A request alone is `not-checked`, not a completed image. There is no automatic paid retry or upload. If a required host capability is absent, explain that concrete limitation and use authorized local material or procedural drawing when that still meets the brief.

Declare indispensable fonts as required assets with a license, hash and restore instructions. Bundled style fonts have their licenses and provenance in the package. Never rely silently on a missing commercial font. Local system fallback can differ by platform; record the environment when comparing pixels.
