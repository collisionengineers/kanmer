# Checklist — SKILL-018

- [ ] Take ticket into `.worktrees/skill-018`, branch `skill-018-skill-frontmatter`, off `origin/main`
- [ ] Fix `plugins/kanmer/skills/kanmer-report/SKILL.md:3` (restructure, no quoting)
- [ ] Re-confirm the other 11 `SKILL.md` files have no colon-space hazard (parser + grep)
- [ ] Add self-contained frontmatter-parse check to `scripts/check-plugin-sync.mjs`
- [ ] Prove the new check fails on a deliberately broken fixture, then passes clean
- [ ] Run rail: `npm test`, `npm run typecheck`, `npm run plugin:check`
- [ ] Real `agy` BEFORE proof already captured (11/12, logged parse error) — carry into proof.md
- [ ] Real `agy` AFTER proof: 12/12, no parse-error log lines
- [ ] Positive control: reintroduce hazard into a different skill's installed copy, confirm it drops out, then revert
- [ ] Restore `.agents/skills/kanmer-report/SKILL.md` to original bytes, hash-verify
- [ ] Write post-implementation report, open PR
- [ ] Verification run (this box produces proof.md)

## Progress notes

(append with `set_ticket_doc(doc: "checklist", append: true)`)
