# Checklist

- [x] every shipped document template has the identity line at line 3 (the 14 FRD-014 document templates; auto run-state/current-run and contributor-guide templates are separate system assets)
- [x] fixed shape `*The X. Not the Y — …*` so the check is a grep
- [x] `files-template.md` rewritten: Files, two tables, context table explained
- [x] research↔files contrast
- [x] plan↔checklist contrast
- [x] report↔proof contrast
- [x] open-questions↔scratch contrast
- [x] pr↔report contrast
- [x] PRD/FRD/ADR three-way contrast
- [x] `proof-visual-template.md` — images under `proof/`
- [x] `proof-test-template.md` — pasted real output
- [x] base proof template points at both
- [x] ticket template: `profile`, `groups`; `priority` gone
- [x] exit grep produces no output

## Progress notes

- 2026-08-21 — Existing merged implementation from PR #18 (`78ee829b33a41503128e214f393053ae34b2ba22`) is reachable from main. Audit found the current `kanmer-plan/assets/plan-template.md` rewrite had replaced its fixed identity line; restored the in-scope `*The plan. Not the checklist — …*` line in `b609c383a203d3956f09a72a324ed09396b28227`.
- 2026-08-21 — Targeted 14-document-template audit: identity-line grep 14/14, priority hits 0, files-template Impact hits 0. `npm run verify:skills` passed all checks; `npm run verify:agents-block` passed 31/31; `npm run test:scripts` passed 80/80 after building core (the initial pre-build run failed only because ignored core dist was absent).
- 2026-08-21 — Root `npm run plugin:check` passed (34 tools, bundle bytes match, skill frontmatters/manifests valid). Auto run-state/current-run and contributor-guide templates were read but left untouched as separate system-template scope. Deep-mode summary and group template remain the documented non-goals from the merged report because no corresponding shipped asset exists.

## Closeout — SKILL-002

- [x] PR merge verified (`gh pr view --json state,mergedAt`)
- [x] proof.md finalised (PR URL + merge date recorded)
- [x] Moved to final stage
- [x] Outcome recorded in ticket report
- [ ] cd out of worktree; `git worktree remove .worktrees/skill-002`
- [ ] `git branch -d skill-002-template-guidance`
- [ ] `git fetch --prune` + `git worktree prune`
- [ ] `take_ticket action: "release"`
