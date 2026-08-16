# Post-implementation report — SKILL-018

## Summary

`kanmer-report/SKILL.md`'s `description:` contained two unquoted `"X": `
colon-space sequences inside a plain YAML scalar — invalid per the YAML spec,
which forbids `: ` anywhere in an unquoted scalar. Antigravity's Go YAML
parser rejected the frontmatter and silently dropped the skill; confirmed with
the real `agy` 1.1.13 CLI (11/12 skills before, logged parse error naming the
file and line). Restructured the description to use an em dash instead of a
colon in both places — no quoting added, no routing terms removed — and
re-ran the same real-CLI check: 12/12 skills, `kanmer-report` present, no
parse-error log lines. Swept the other 11 skills for the same hazard (clean).
Added a third check to `scripts/check-plugin-sync.mjs` so this class of defect
fails `npm run plugin:check` before it can ship again; demonstrated the check
failing on a deliberately reintroduced broken fixture and passing clean after.

## Changes

| File | Change | Why |
|---|---|---|
| `plugins/kanmer/skills/kanmer-report/SKILL.md` | Line 3: replaced `"now": ` and `"since <period>": ` with `now — ` and `since <period> — ` inside the `description:` value | Removes the two colon-space sequences a plain YAML scalar can't legally contain, restructuring rather than quoting per the ticket's stated preference |
| `scripts/check-plugin-sync.mjs` | Added a third, self-contained check (`checkSkillFrontmatter()`) that parses every `plugins/kanmer/skills/*/SKILL.md` frontmatter block with the `yaml` package and fails with file+message on any parse error; folded the skill count into the existing success line | Makes this defect class a rail failure instead of a silent, host-specific drop. Added as its own clearly-separated block (imports, function, call site) rather than interleaved with the two existing checks, since MCP-007 is adding a worktree guard to the same file concurrently and needs a clean rebase target |

No other skill file was touched — the sweep (both `yaml`/`js-yaml` strict parsing and a grep for any second `: ` inside each `description:` value) found no hazard in the other 11.

## Governing docs

`refs: ["docs/functional/frd/FRD-023-agent-skills-system.md"]`.

- **Meets**: FRD-023 governs how `SKILL.md` files are authored and distributed
  to hosts; it implicitly assumes every shipped skill is loadable by every
  host. This ticket restores that (a skill was silently unloadable by one
  host) and adds a rail that enforces it going forward. No requirement is
  modified, and no new ADR is needed — both changes are mechanical (YAML
  syntax validity) rather than a design decision.

## Risks / follow-ups

- **MCP-013** (queued, edits all 12 skill files + `AGENTS.md`, rebases onto
  this branch): diff here is exactly 2 files / 48 insertions / 4 deletions —
  no other skill content touched, so the rebase surface is minimal.
- **MCP-007** (queued, adds a worktree guard to the same `scripts/check-plugin-sync.mjs`):
  the new check is a self-contained block (own imports, own function, own
  call site, own comment block) placed after the two existing checks, not
  interleaved with them — should rebase cleanly regardless of where MCP-007's
  guard lands (most likely the very top of the file, before any check).
- Real gap noticed but explicitly out of scope: `.agents/skills/` and
  `.agents/mcp_config.json` (Antigravity's project-scoped install artifacts,
  per `apps/gui/src/main/providers.ts`) are not listed in `.gitignore`, unlike
  their `.claude/skills/` / `.mcp.json` counterparts which are. Worth its own
  ticket if it's confirmed to bite (e.g. blocking `scripts/release.mjs`'s
  dirty-tree check) — not fixed here since it's unrelated to the frontmatter
  defect.
- `plugin:check`'s pre-existing bundle-bytes check (comparing the committed
  `plugins/kanmer/mcp/kanmer-mcp.cjs` against a fresh build) passed clean
  throughout — no server code was touched, and the committed bundle already
  matched a fresh build from this branch, so there was nothing to report on
  that front.

## Verification hand-off

For `kanmer-verify` on merged `main`:
- `npm test`, `npm run typecheck`, `npm run plugin:check` — all green (rail
  results captured in the checklist's progress notes and to be re-captured on
  merged main for `proof.md`).
- Real `agy` (1.1.13) project-bound skill list from `.agents/skills/`
  (Antigravity's install-artifact tree) should show 12/12 `kanmer-*` skills
  with `kanmer-report` present and no `skills.go` parse-error log lines — the
  same check run pre-merge, to be repeated on merged main.
- `npm run plugin:check` should still demonstrate the frontmatter check is
  live (e.g. by the same fail-on-broken-fixture / pass-on-fixed sequence, or
  simply by inspecting the script and confirming the check is present and
  wired into the exit path).
