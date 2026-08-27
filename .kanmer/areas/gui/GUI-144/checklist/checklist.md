# Checklist — GUI-144

- [x] Worktree `.worktrees/gui-144` on branch `gui-144-project-registry` from origin/main
- [x] `apps/gui/src/main/projectRegistry.ts`: contract mirror (schema 1, name regex, validation, location precedence)
- [x] `projectRegistry.ts`: `observeRegistry` with read-only stores, health classification, selected marking (project_id then fingerprint), controllers/workspaces with claim + defensive lease fields
- [x] `projectRegistry.ts`: serialised writer (queue + stale-edit guard + atomic rename) with upsert/rename/remove/setPolicy
- [x] `projectRegistry.test.ts`: location, parse/validate matrix, two fixture boards with distinct health, missing/invalid/malformed, concurrent upserts, stale-edit guard, contract check against the server module
- [x] `shared/ipc.ts` + `preload/index.ts`: five registry channels and view types
- [x] `main/index.ts`: handlers registered; add uses open `ProjectContext` roots only; name/policy validated at the boundary
- [x] `ProjectRegistry.tsx` section + Settings "Projects" tab; non-selected endpoints only "Open project"
- [x] `ProjectRegistry.test.tsx`: two endpoints with distinct health; non-selected has no mutation controls; add/rename/remove call the api
- [x] Docs: `settings.md` Projects section, `connect.md` sentence, `npm run build:manual` regenerated and committed
- [x] [pre-review] `npm test -w @kanmer/gui` 0 (52 files), `npm run typecheck -w @kanmer/gui` 0, `npm run check:manual` 0, `npm run verify:docs` 0, `npm run build -w @kanmer/gui` 0
- [x] [pre-review] Post-implementation report written; PR #294 open with `Kanmer: GUI-144` footer; ticket moved to Review; stop
- [x] [remediation 1] Rebase onto origin/main 3dd48d37; reproduce F-001; fix F-001..F-007 (F-008..F-012 accepted-risk); focused vitest 22/22, typecheck 0, `npm test -w @kanmer/gui` 515/515, check:manual 0, verify:docs 0; head 50ff61cc pushed to PR #294; hosted `verify` success, `kanmer-gate` WRONG_STAGE (stale board, controller re-run); report updated; ticket back to Review
- [x] [remediation 2] Rebase onto origin/main 9c9a6980 (CORE-124); fix F-013 (requestOpen routing + `key={root}` + Settings draft guard + tests), F-014 (assertSelectedEndpoint matches the bound endpoint among duplicates + test), F-015 ("Open project" disabled unless health ok/unassigned + test); F-008..F-012 unchanged; typecheck 0, focused vitest 27/27, `npm test -w @kanmer/gui` 53 files/520 tests 0, check:manual 0, verify:docs 0; head 190b022a force-with-lease pushed to PR #294; report updated; ticket back to Review

## Progress notes

- 2026-08-27 head a9033ec2, PR https://github.com/collisionengineers/kanmer/pull/294. Deviation: GUI mirrors the registry contract (no typed server import available); contract test proves parity.
- 2026-08-27 remediation round 1: head 50ff61cc (rebased; a9033ec2 unreachable). Deviation: `App.tsx` touched for one prop (`onOpenProject`) to satisfy F-002.
- 2026-08-27 remediation round 2: head 190b022a (rebased onto 9c9a6980; 50ff61cc unreachable). Deviation: `Settings.tsx`/`App.tsx` gain a keyed remount + draft guard and a new `Settings.projects.test.tsx` — required by F-013's structural fix.

---

## Closeout — GUI-144

- [x] PR merge verified (`gh pr view --json state,mergedAt`) — MERGED at 2026-08-27T22:26:29Z, mergeCommit f3060b063b6f206603ac35c3b595d21752dff3f6
- [ ] proof.md finalised (PR URL + merge date appended)
- [ ] Moved to final stage
- [ ] Outcome recorded in ticket body (PR link, follow-ups)
- [ ] cd out of worktree; `git worktree remove .worktrees/<id>`
- [ ] `git branch -d <branch>` (`-D` if squash/rebase-merged)
- [ ] `git fetch --prune` + `git worktree prune`
- [ ] `take_ticket action: "release"`

Closeout progress: proof.md finalised (PR URL + merge date appended); Outcome recorded in ticket body; already Done/not archived so no stage move needed.

Git cleanup: `.worktrees/gui-144` and `.worktrees/verify-gui-144-f3060b063b6f206603ac35c3b595d21752dff3f6` removed (clean `git worktree remove`, no force needed); no stray `gui-144-*.log` files found; local branch `gui-144-project-registry` deleted with `-d` (already merged); remote branch deleted via `git push origin --delete`; `git fetch --prune` + `git worktree prune` run. `.worktrees/kanmer` and `.worktrees/core-125` untouched. Releasing claim next.
