# Tools and installation

From this package run `npm ci --ignore-scripts` once to install locked JavaScript dependencies. The core uses Node >=22, an existing Chrome/Chromium, FFmpeg and ffprobe. Optional Python voice tools target Python 3.12. Run `node scripts/aaa.mjs doctor --json`; set `AAA_CHROME` to an existing browser executable when autodetection is insufficient. No upstream clone or automatic update is used.

Register in a repository: `node scripts/install.mjs --host both --root <repo>`. This creates `.agents/skills/all-about-arts` for Codex and `.claude/skills/all-about-arts` for Claude Code, pointing to the canonical package. `--scope user --host codex` or `--host claude` registers in the corresponding user's skill directory. The installer refuses to overwrite an existing unrelated skill. For independent distribution add `--copy --dependencies`; the package lock is preserved.

For Google Antigravity App/IDE use `node scripts/install.mjs --host antigravity --root <repo>`. Current Antigravity uses `.agents/skills/all-about-arts`, sharing the Codex workspace entry without duplicating the package. Open the repository root and start a new conversation, then request `all-about-arts` by name; the App also supports `/all-about-arts`. The IDE lists discovered skills in Customizations. User-scope installation targets `~/.gemini/config/skills` for the App/IDE; Antigravity CLI has a different global location, so use project scope for a shared entry across surfaces. See [official discovery and invocation documentation](https://antigravity.google/docs/skills) (checked 2026-10-20). `both` retains its Codex + Claude meaning.

Use an absolute script path when your working directory is a film. `node <skill>/scripts/aaa.mjs help` lists commands. After `npm link` (only when requested), the same entrypoint is `aaa`; no global link is needed.

Typical local flow:

```sh
node <skill>/scripts/aaa.mjs init <film> --style dataviz --title "A city uses less water"
node <skill>/scripts/aaa.mjs still <film> --time 4
node <skill>/scripts/aaa.mjs studio <film>
node <skill>/scripts/aaa.mjs render <film> --workers 2 --json
node <skill>/scripts/aaa.mjs export <film> --json
```

Other commands: styles/query, assets/check/import/request/receipt, voice/import/generate, audio, check, snapshot, undo, inbox/add/update, learn. Core JSON responses use `success`, `failure` or `not-checked`. Exit 1 accompanies failure. Inspect report fields as well as the aggregate status. `check` without an encoded file performs source/page checks and explicitly leaves output inspection unrun.

Rendering holds exclusive project and output locks. Cancellation releases owned locks and temp segments; after an uncatchable process kill, inspect the PID in a leftover lock before manually removing that lock. Do not delete a live owner's lock. Existing final videos are replaced only after a new build validates; versioned delivery folders are not overwritten.

For an encoding failure inspect the returned FFmpeg message. Missing models affect optional TTS/ASR, not silent drawing. Generation requests can be handed to the active host; no particular proprietary tool is required.

Experience commands (use the full script path as above):

```sh
aaa learn <film> list --json
aaa learn <film> add --kind observation --text "Caption needs a longer hold at 4s" --evidence out/cover.png
aaa learn <film> add --kind verified --text "A scoped conclusion from two inspected cases" --evidence evidence/case-a.json,evidence/case-b.json
aaa learn <new-film> reuse --from <previous-film> --id <lesson-id> --json
```

`list` rechecks evidence and reports `reusable` for each entry; a successful list operation does not mean every lesson is valid. `reuse` accepts only a selected verified lesson with current, distinct evidence and copies that evidence into the target project. Preferences are kept local. See [evolution.md](evolution.md) for the agent's improvement workflow and the limits of automated evidence checks. Code, dependency locks and regression tests are maintained here directly; no original checkout, provenance-lock update or original-renderer comparison is needed.
