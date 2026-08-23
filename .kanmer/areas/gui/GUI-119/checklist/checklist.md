# Checklist

- [x] Confirm the exact CORE-043 parent head `1126253eed586111db60ed72eccf6754f0f5ef06`, branch `gui-119-provider-branch-propagation`, and worktree `.worktrees/gui-119`.
- [x] Read the complete GUI-119 packet, HZN-007 context, FRD-020, FRD-012, and ADR-0016 before implementation.
- [x] Propagate the saved branch through the OpenAI tunnel's Claude MCP invocation factory from the production Electron startup path.
- [x] Propagate the saved branch through remote-access runtime and doctor child environments, with normalization and deterministic coverage.
- [x] Bind the saved branch into a temporary Claude marketplace descriptor for marketplace install/update without mutating the bundled or user-global marketplace.
- [x] Add deterministic production-seam regressions, including the shell-adversarial branch `team&whoami`.
- [x] Run and record focused/full GUI attempts, GUI typecheck/build, manual/docs, scripts, and diff checks; preserve the initial full-suite marketplace timeout and subsequent full-suite INCONCLUSIVE hang rather than calling them PASS.
- [x] Update this packet and the CORE-043 implementation trace with exact scope, rails, limitations, and handoff lineage.
- [ ] Post-merge verification/proof remains for the independent review/merge lane.

## Evidence notes

- Focused provider rail: `npm run test -w @kanmer/gui -- --run src/main/connect.test.ts src/main/remoteAccess/manager.test.ts src/main/openaiTunnel.test.ts` — exit 0, 3 files / 56 tests PASS.
- Standalone connect rail: `npm run test -w @kanmer/gui -- --run src/main/connect.test.ts` — exit 0, 35/35 PASS.
- `npm run typecheck -w @kanmer/gui` — exit 0.
- `npm run build -w @kanmer/gui` — exit 0.
- `npm run check:manual` and `npm run verify:docs` — exit 0; manual current (22 chapters).
- `npm run test:scripts` first attempt — exit 1 because the fresh worktree lacked `packages/core/dist`; after `npm run build:core` exit 0, scripts 89/89 PASS.
- A full GUI attempt with the initial whole-repository marketplace staging timed out the new test at Vitest's 5s default (exit 1). Staging was narrowed to marketplace manifests and `plugins/kanmer`; a subsequent full attempt reached all test files but did not return a final summary and was stopped (INCONCLUSIVE). This is not represented as a full-suite PASS.
- No real Claude/OpenAI/remote provider host, installed marketplace, tunnel, or live protected-branch evidence was available; those boundaries remain INCONCLUSIVE.

# Closeout checklist

Append to the ticket's checklist.md when closeout starts
(`set_ticket_doc doc: "checklist", append: true`) so cleanup progress is
visible on the board.

---

## Closeout — GUI-119

- [ ] PR merge verified (`gh pr view --json state,mergedAt`)
- [ ] proof.md finalised (PR URL + merge date appended)
- [ ] Moved to final stage
- [ ] Outcome recorded in ticket body (PR link, follow-ups)
- [ ] cd out of worktree; `git worktree remove .worktrees/<id>`
- [ ] `git branch -d <branch>` (`-D` if squash/rebase-merged)
- [ ] `git fetch --prune` + `git worktree prune`
- [ ] `take_ticket action: "release"`
