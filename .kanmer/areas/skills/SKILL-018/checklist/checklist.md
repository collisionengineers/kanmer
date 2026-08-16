# Checklist — SKILL-018

- [x] Take ticket into `.worktrees/skill-018`, branch `skill-018-skill-frontmatter`, off `origin/main`
- [x] Fix `plugins/kanmer/skills/kanmer-report/SKILL.md:3` (restructure, no quoting)
- [x] Re-confirm the other 11 `SKILL.md` files have no colon-space hazard (parser + grep)
- [x] Add self-contained frontmatter-parse check to `scripts/check-plugin-sync.mjs`
- [x] Prove the new check fails on a deliberately broken fixture, then passes clean
- [x] Run rail: `npm test`, `npm run typecheck`, `npm run plugin:check`
- [x] Real `agy` BEFORE proof already captured (11/12, logged parse error) — carry into proof.md
- [x] Real `agy` AFTER proof: 12/12, no parse-error log lines
- [x] Positive control: reintroduce hazard into a different skill's installed copy, confirm it drops out, then revert
- [x] Restore `.agents/skills/kanmer-report/SKILL.md` to original bytes, hash-verify
- [x] Write post-implementation report, open PR
- [x] Verification run (this box produces proof.md)

## Progress notes

(append with `set_ticket_doc(doc: "checklist", append: true)`)

---

**Real-CLI evidence (agy 1.1.13, project-bound sessions, `.agents/skills/` install artifact):**

- BEFORE (pre-existing broken frontmatter): 11/12 skills listed, `kanmer-report` missing.
  Log: `Failed to parse skill file ...kanmer-report\SKILL.md: failed to parse frontmatter:
  yaml: line 2: mapping values are not allowed in this context` (4x, once per agy subagent).
- AFTER (fixed frontmatter copied in from the worktree): 12/12 skills listed, `kanmer-report`
  present, zero parse-error log lines.
- Positive control (fix in place, `kanmer-auto`'s installed copy deliberately given the same
  hazard): `kanmer-auto` — and only it — dropped to 11/12, with the parse error now logged for
  `kanmer-auto` instead. Confirms the before/after methodology is genuinely sensitive to
  breakage, not a fluke of caching/prompt phrasing. Reverted immediately after (hash-verified
  restore of both `kanmer-report` and `kanmer-auto` installed copies).

**Rail check fail→pass demonstration (deliberately broken fixture):**
Temporarily reintroduced the exact original broken `kanmer-report/SKILL.md` text in the
worktree, ran `npm run plugin:check`: exit 1, `Skill frontmatter failed to parse under a
strict YAML parser: ... Nested mappings are not allowed in compact mappings at line 2,
column 14:`. Restored the fix, re-ran: exit 0, `plugin-sync OK — 29 tools match, bundle
bytes match, 12 skill frontmatters parse`.

**Environment note (unrelated to this ticket):** running the rail from inside
`.worktrees/skill-018` initially hit `npm run typecheck` failures (`RootSource`,
`discoverBoardRoot` not exported from `@kanmer/core`) because the worktree has no
`node_modules` of its own and Node resolution walked up to the main checkout's stale
`packages/core/dist` (AGENTS.md §8's documented worktree trap). Fixed by running `npm
install` inside the worktree (isolated `node_modules`, no changes to the main checkout) and
`npm run build:core` there — not by rebuilding anything in the shared main checkout. All four
workspaces (`@kanmer/core`, `@kanmer/mcp-server`, `@kanmer/ui`, `@kanmer/gui`) then typecheck
clean. `npm test`'s `kanmerGit.test.ts` (real git operations, 20-30s) was flaky once across
several runs — unrelated to this change (no git/GUI code touched) and passed clean on
immediate re-run and in the final full-suite run (423/423).

## Closeout — SKILL-018

- [x] PR merge verified (`gh pr view --json state,mergedAt` → MERGED, 2026-08-16T22:43:57Z, mergeCommit fc2045b)
- [x] proof.md finalised (PR URL + merge context in proof.md body)
- [x] Moved to final stage (done)
- [ ] Outcome recorded in ticket body (PR link, follow-ups)
- [ ] cd out of worktree; `git worktree remove .worktrees/skill-018`
- [ ] `git branch -D skill-018-skill-frontmatter` (squash-merged, not an ancestor of main)
- [ ] `git fetch --prune` + `git worktree prune`
- [ ] `take_ticket action: "release"`
