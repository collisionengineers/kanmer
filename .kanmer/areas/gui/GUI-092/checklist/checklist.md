# Checklist — GUI-092

- [x] Add and test local release artifact coherence verification.
- [x] Resolve whether the installed Electron Builder can safely publish exact existing files; record the config-validation limitation.
- [x] Replace the two NSIS package invocations with one `--win --publish always` package after tag push.
- [x] Run packed-app validation and local coherence validation after the sole package.
- [x] Change failed remote verification to a bounded re-check that never repackages.
- [x] Update dry-run/release diagnostics to describe the one-package workflow.
- [x] Run script tests, relevant type/build/package checks, and diff check.
- [ ] Record the next-release installed-client acceptance as external follow-up evidence; do not claim it locally.

## Progress notes

- The `electron-builder publish --files` command advertised by v26.15.3 rejects this repository's valid GitHub publish config even under `--policy never`; it was not adopted.
- `npx electron-builder --win --publish never` followed by `check-updater-package.mjs` passes locally as a no-network packaging analogue.

---

## Closeout — GUI-092

- [x] PR merge verified (`gh pr view --json state,mergedAt`)
- [x] proof.md finalised (PR URL + merge date recorded)
- [x] Moved to final stage
- [ ] Outcome recorded in ticket body (PR link, follow-ups)
- [ ] cd out of worktree; `git worktree remove .worktrees/gui-092`
- [ ] `git branch -d gui-092-one-pack-release` (`-D` if squash/rebase-merged)
- [ ] `git fetch --prune` + `git worktree prune`
- [ ] `take_ticket action: "release"`
