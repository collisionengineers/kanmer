# GUI-091 checklist

- [x] Re-read the main-process boot/smoke lifecycle and isolate the smallest testable capture-output helper.
- [x] Implement an opt-in `KANMER_SMOKE_CAPTURE_PATH` route that is inert outside smoke mode.
- [x] After the live renderer is ready, write and read back a unique DOM marker before calling `webContents.capturePage()`.
- [x] Reject empty/invalid capture output and return a non-zero smoke result on marker, capture, or write failure.
- [x] Write the captured PNG to the explicit caller-provided path without changing user settings, IPC, or normal application behaviour.
- [x] Add focused automated tests for path/output and smoke decision boundaries.
- [x] Document the capture command, expected artifact, fresh user-data requirement, and renderer-only limitation.
- [x] Run focused GUI tests, the full GUI suite, GUI build, typecheck, and diff check.
- [x] Run a real Electron smoke capture, confirm non-empty PNG, inspect it for the current unique marker, and record dimensions.
- [x] Confirm the regular smoke lifecycle remains unchanged when `KANMER_SMOKE_CAPTURE_PATH` is absent.
- [x] Write the post-implementation report with commands, artifacts, limitation, and out-of-scope GUI-068 note.
- [x] Open PR #98 with commit/PR traceability and record the review verdict.
- [x] Verify the merged-main capture workflow and write proof.
- [ ] Close out the merged worktree and branch.

---

## Closeout — GUI-091

- [ ] PR merge verified (`gh pr view --json state,mergedAt`)
- [ ] proof.md finalised (PR URL + merge date appended)
- [x] Moved to final stage
- [ ] Outcome recorded in ticket body (PR link, follow-ups)
- [ ] cd out of worktree; `git worktree remove .worktrees/gui-091`
- [ ] `git branch -d gui-091-electron-capture-smoke` (`-D` if squash/rebase-merged)
- [ ] `git fetch --prune` + `git worktree prune`
- [ ] `take_ticket action: "release"`
