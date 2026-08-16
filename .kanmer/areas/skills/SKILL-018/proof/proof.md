# Proof — SKILL-018

Verified on merged `main`, main checkout `C:\Users\PC\Documents\GitHub\kanmer`,
after `git pull --ff-only origin main` to commit `fc2045b` (SKILL-018's squash
merge, PR #42) — confirmed still an ancestor of the current `origin/main` tip
(`c81063e`, from an unrelated concurrently-merged PR).

## agy real-CLI evidence (the ticket's primary bar)

`agy` 1.1.13, project-bound sessions (`--new-project -p "…"`), against
`.agents/skills/` — Antigravity's project-scoped install-artifact tree per
`apps/gui/src/main/providers.ts` (`skillsDir: ".agents/skills"`).

**Before the fix** (pre-existing broken frontmatter, captured during research,
prior to any change on this branch):
```
kanmer-auto
kanmer-closeout
kanmer-docs
kanmer-execute
kanmer-groom
kanmer-plan
kanmer-research
kanmer-review
kanmer-setup
kanmer-tickets
kanmer-verify
```
11 of 12 — `kanmer-report` missing. Log (`--log-file`), 4 lines (one per agy
subagent), all identical:
```
Failed to parse skill file C:\Users\PC\Documents\GitHub\kanmer\.agents\skills\kanmer-report\SKILL.md: failed to parse frontmatter: yaml: line 2: mapping values are not allowed in this context
```

**After the fix, on merged main** (`.agents/skills/kanmer-report/SKILL.md`
copied from `plugins/kanmer/skills/kanmer-report/SKILL.md` as it exists at
commit `fc2045b`):
```
kanmer-auto
kanmer-closeout
kanmer-docs
kanmer-execute
kanmer-groom
kanmer-plan
kanmer-report
kanmer-research
kanmer-review
kanmer-setup
kanmer-tickets
kanmer-verify
```
12 of 12 — `kanmer-report` present. Log grepped for `kanmer-report|yaml|parse|frontmatter`: no matches.

**Positive control** (fix in place; deliberately reintroduced the identical
colon-space hazard into `kanmer-auto`'s installed copy, everything else
unchanged): the skill list dropped to 11/12 with `kanmer-auto` — and only
`kanmer-auto` — missing, and the log now named `kanmer-auto`'s file with the
same parser error. `kanmer-report` remained present throughout. This confirms
the before/after methodology genuinely detects breakage (not a fluke of
caching or prompt phrasing) rather than merely asserting a clean result.
Reverted immediately after.

**Machine-state restore**: `.agents/skills/kanmer-report/SKILL.md` and
`.agents/skills/kanmer-auto/SKILL.md` (pre-existing, untracked, not
gitignored install-artifact copies in the main checkout — not created by this
ticket) were hashed before any test touched them and restored afterward,
hash-verified equal both times:
- `kanmer-report`: `4e780d1ec1ce2a3900df08f40e78ce5c` (before test / after final restore — match)
- `kanmer-auto`: `6bd402afca25b19dfe6485bdf1422615` (before control / after control — match)

`git status --short` on the main checkout shows only the same pre-existing
untracked files (`.agents/mcp_config.json`, `.agents/skills/`, `.codex/`,
`icon.png`, `logo.png`) that were present before this ticket's work began —
no residue from testing.

## Rail check fail→pass demonstration

Deliberately reintroduced the exact original broken `kanmer-report/SKILL.md`
frontmatter as a fixture (in the ticket's worktree, before merge) and ran
`npm run plugin:check`:
```
Skill frontmatter failed to parse under a strict YAML parser:
  ...kanmer-report\SKILL.md: Nested mappings are not allowed in compact mappings at line 2, column 14:
```
Exit code 1. Restored the fix, re-ran:
```
plugin-sync OK — 29 tools match, bundle bytes match, 12 skill frontmatters parse
```
Exit code 0.

## Rail on merged main

- `npm run build` (core + mcp-server, gitignored dist only — the committed
  `plugins/kanmer/mcp/kanmer-mcp.cjs` was not touched) — clean, needed once
  after pulling unrelated upstream core changes (MCP-010) so `tsc`/`plugin:check`
  weren't working against stale local dist (AGENTS.md §8 gotcha; not this
  ticket's concern).
- `npm run typecheck` — clean, all 4 workspaces named (`@kanmer/core`,
  `@kanmer/mcp-server`, `@kanmer/ui`, `@kanmer/gui`).
- `npm run plugin:check` — `plugin-sync OK — 29 tools match, bundle bytes
  match, 12 skill frontmatters parse`.
- `npm test`: `@kanmer/core` 193/193 clean on every run. `@kanmer/gui`'s
  `kanmerGit.test.ts` (`renameBoardBranch > keeps the history, the path and
  the remote consistent`, real git subprocess operations, vitest's default
  5000ms timeout) intermittently timed out across several runs on this
  machine while multiple other Kanmer agents were concurrently doing heavy
  git work in sibling worktrees under the same repo tree (`.worktrees/kanmer`,
  `.worktrees/gui-072`, `.worktrees/gui-080`, `.worktrees/mcp-010`,
  `.worktrees/skill-018`). Diagnosed, not hand-waved: reran that single test
  file with `--testTimeout=30000` — passed 7/7 clean, the offending assertion
  taking 8219ms (well over the 5000ms default, well under 30000ms) —
  confirming this is environmental load, not a functional regression. This
  test touches board-worktree git operations; SKILL-018 changed no git code
  and no file `kanmerGit.test.ts` exercises. Earlier, in the ticket's own
  isolated worktree (`.worktrees/skill-018`, before merge, less contended),
  the full suite ran clean at 423/423 (193 core + 230 gui) on both the first
  and a repeat run.

## Conclusion

`agy` loads all 12 `kanmer-*` skills on merged main, evidenced by the real CLI
from a project-bound session with a positive control proving the detection
method works — not by reading the file and assuming. The rail
(`npm run plugin:check`) now fails on a deliberately broken skill frontmatter
and passes on a valid one, demonstrated both ways. No routing value was lost
in `kanmer-report`'s description. Ticket's three verification criteria all met.
