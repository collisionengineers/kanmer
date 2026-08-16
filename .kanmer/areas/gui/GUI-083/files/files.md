# Files — GUI-083

## Where the change lands

| Path | Why |
|---|---|
| `.gitignore` | Add rules for the Connect-written destinations that currently have none: `.agents/skills/`, `.agents/mcp_config.json`, `.grok/skills/`, `.codex/config.toml`, `opencode.json` — specific enough to leave `.agents/plugins/marketplace.json` tracked. |
| `apps/gui/src/main/providers.test.ts` | Add a regression check: every `copySkills` destination (`skillsDir`) declared in `PROVIDERS` has a matching `.gitignore` rule, so a new provider can't reintroduce the gap. |
| `docs/functional/frd/FRD-012-connect.md` | Record the `.codex/config.toml` (and `opencode.json`) commit-or-ignore decision and its reasoning, per the mission's explicit instruction not to leave the asymmetry unexplained. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `apps/gui/src/main/providers.ts` | The source of truth for every destination Connect writes — `InstallSpec.skillsDir` (copySkills) and `RegisterSpec.configPath` (configFile). Read, do not edit — GUI-079 is in flight editing this file. |
| `.gitignore` (existing `.mcp.json` block, lines 35-41) | The established precedent and its stated reason: a Connect-written config file gets ignored, with a comment, when it hardcodes machine-specific absolute paths. `.codex/config.toml` and `opencode.json` fit the same reason (see research). |
| `apps/gui/src/main/providers.test.ts` (`describe("provider registry", ...)`) | Existing conventions for testing `PROVIDERS`: imports, the `inv`/`ROOT` fixtures, and how `configPath`/`install.kind` are asserted — the new check should read like the rest of the file. |
| `scripts/verify-agents-block.mjs` | Precedent for a "generated artifact stays in sync with source" check in this repo — but it's a standalone script because AGENTS.md verification runs outside any one workspace's vitest. Not the pattern to copy here since `providers.ts` lives inside `apps/gui`, whose vitest already runs in CI. |
| `docs/functional/frd/FRD-012-connect.md` | Where the `.codex/` decision must be recorded — it already documents the R1 registration matrix and ADR-0007's role, so the new note belongs alongside that, not as a new top-level doc. |

## Ripple effects

- `apps/gui/src/main/providers.test.ts` runs under `npm run test -w @kanmer/gui`, part of the root `npm test`, so the new check runs in CI automatically — no new script wiring.
- No production code changes (no `providers.ts` edit) — GUI-079 is in flight there; this ticket only reads it.
- Committing `.gitignore` does not remove any files already on disk (untracked stays untracked, just no longer shown by `git status`). Nothing to migrate.
- `AGENTS.md` must NOT be touched or committed this run (known hazard #3 — Connect has written a stale v2 block into this checkout).

## Out of scope

- Not fixing the underlying redundancy FRD-012 already flags (grok's separate `.grok/skills` write being redundant with `.agents/skills` — owned by MCP-014) — only ignoring what's currently written.
- Not changing `providers.ts` itself (no new provider, no dedup of `.grok/skills` vs `.agents/skills`) — GUI-079 owns edits to that file right now.
- Not deleting the untracked artifacts already on disk in the main checkout — several agents are working in parallel worktrees; removing their working state is not this ticket's job.
- Not resolving `.mcp.json`'s pre-existing dual-write bug for grok/claude (GUI-079's concern) — `.mcp.json` is already ignored and untouched here.
