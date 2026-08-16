# Files — SKILL-018

## Where the change lands

| Path | Why |
|---|---|
| `plugins/kanmer/skills/kanmer-report/SKILL.md` | Line 3 (`description:`) contains two unquoted `"X": ` colon-space constructs inside a plain YAML scalar — the confirmed defect. Restructure to remove the colon-space without losing routing meaning. |
| `scripts/check-plugin-sync.mjs` | Already the rail for plugin-bundle sync (`npm run plugin:check`). Add a third check: every `plugins/kanmer/skills/*/SKILL.md` frontmatter block must parse under a strict YAML parser (the `yaml` package). |

## Context files

| Path | What it tells the implementer |
|---|---|
| `plugins/kanmer/skills/kanmer-auto/SKILL.md` ... `kanmer-verify/SKILL.md` (the other 11 `SKILL.md` files) | Swept clean: parsed under both the `yaml` package (strict) and `js-yaml` (CORE_SCHEMA) with no failures, and grepped for any second `: ` inside their `description:` value — zero hits. No content change needed in any of them. Still worth re-running the same parse check on all 12 as part of verification, since that's the rail's actual job. |
| `apps/gui/src/main/providers.ts` (around L373-388) | Antigravity ("agy") is registered with `install: { kind: "copySkills", skillsScope: "project", skillsDir: ".agents/skills" }` — it reads `.agents/skills/<name>/SKILL.md`, a project-scoped copy, not `plugins/kanmer/skills/` directly. `.claude/skills/` is the equivalent Claude-Code-facing copy. Both are install artifacts, not source. `dispatch: false` for antigravity ("`agy -p` is known-broken piped") — matches the ticket's note that a *project-bound* session (`--new-project` / `--project <id>`) is needed to see workspace skills, not a bare `agy -p`. |
| `.gitignore` (L36-41) | Documents why `.mcp.json` and `.claude/skills/` are untracked-and-ignored (absolute machine paths / local skill copy) and that leaving them tracked would make `scripts/release.mjs` see a dirty tree. `.agents/skills/` and `.agents/mcp_config.json` are the Antigravity equivalents but are **not** listed here — they exist untracked-but-not-ignored in the current main checkout (pre-existing, not created by this ticket's work). Out of scope to fix that gap in this ticket; noted for awareness only. |
| `scripts/check-plugin-sync.mjs` (whole file) | Existing rail structure/style to match: resolves `root` via `import.meta.url`, reads files, prints one summary line on success, `process.exit(1)` with a clear message on failure. The bundle-bytes check at the bottom requires a prior `npm run build` — unrelated to the new frontmatter check, do not touch it, do not rebuild/commit `plugins/kanmer/mcp/kanmer-mcp.cjs` (explicit ticket constraint). |
| `packages/core/package.json`, `apps/gui/package.json` | Both declare `"yaml": "^2.5.1"` as a direct dependency, which is why it's already present in the hoisted root `node_modules/yaml` even though the root `package.json` doesn't list it directly. Using it from `scripts/check-plugin-sync.mjs` (run via `node` from repo root) is safe on a normal `npm install`; no new dependency needs to be added. |

## Ripple effects

- **MCP-013** (queued): edits all 12 skill files + `AGENTS.md`, rebases onto this ticket's branch. Keep this diff to exactly the `kanmer-report` description line plus the new rail-check block, so that rebase stays trivial.
- **MCP-007** (queued): adds a worktree guard to `scripts/check-plugin-sync.mjs`, touching the same file. The new frontmatter check will be added as a clearly separated, self-contained block (its own function + its own `if (...) { ...; process.exit(1); }`), not interleaved with the existing two checks, so MCP-007's addition can rebase around it.
- No test suite currently covers `plugins/kanmer/skills/**`; `npm run plugin:check` becomes the only rail that would catch this class of defect going forward.
- `.agents/skills/` (untracked, pre-existing in the main checkout) has a stale copy of `kanmer-report/SKILL.md` with the current broken frontmatter — used read-only for the BEFORE real-`agy` proof. It will be refreshed with the fixed file for the AFTER proof and then restored to its original bytes (hashed before touching: md5 `4e780d1ec1ce2a3900df08f40e78ce5c`) since it's borrowed machine state, not part of this ticket's diff.

## Out of scope

- Rebuilding/committing `plugins/kanmer/mcp/kanmer-mcp.cjs` — explicit ticket constraint; if `plugin:check`'s existing bundle-bytes check fails for unrelated reasons, report it, don't fix it here.
- Editing `.claude/skills/` or `.agents/skills/` as source, or gitignoring `.agents/skills/`/`.agents/mcp_config.json` — real gap, but a separate concern from this ticket's defect.
- Any wording change to the other 11 skills' descriptions — swept and confirmed clean; changing them anyway would just enlarge the diff MCP-013 has to rebase across for no defect fixed.
- Escaping/quoting approach for the fix — restructuring (em dash instead of colon) is preferred per the ticket and reads at least as well.
