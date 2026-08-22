# Files map — CORE-060

## Change surface

| File | Expected change | Risk / proof |
|---|---|---|
| `apps/gui/src/main/kanmerGit.ts` | Record generated mismatch error/pause provenance and expose a safe state transition helper/fields. | State transitions must not hide genuine sync failures; prove pure regressions. |
| `apps/gui/src/main/index.ts` | Distinguish timer-triggered sync from manual Retry; skip scheduling/execution while handoff is paused or mismatched. | Concurrency boundary can resurrect a protected ref; prove timer and manual paths. |
| `apps/gui/src/main/kanmerGit.test.ts` | Add exact-destination cleanup and preservation tests. | Guards against permanent false pause and lost errors. |
| `apps/gui/src/main/index.test.ts` (or nearest main test seam) | Add timer/state regressions if the existing test harness exposes scheduling. | Proves automatic sync cannot run during handoff pause. |
| `docs/manual/board-sync.md` / `docs/manual/troubleshooting.md` | Keep Retry and handoff-pause behavior precise. | User-facing recovery must not claim a timer is active while paused. |
| `apps/gui/src/renderer/src/manual/chapters.generated.ts` | Regenerate shipped manual if source text changes. | Packaged manual parity. |

## Context files

| File | Why it matters |
|---|---|
| `docs/functional/frd/FRD-020-board-git-worktree-sync.md` | Requires conflict pause, visible error, and Retry semantics. |
| `docs/architecture/adr/ADR-0016-compiled-workflow.md` | Keeps protected-branch handoff external and fail-closed. |
| `apps/gui/src/renderer/src/components/Settings.tsx` | Shows Sync now/Retry and receives paused/error status. |
| `apps/gui/src/shared/ipc.ts` | Defines the typed status payload crossing main/renderer. |
| `AGENTS.md` | Requires surfaced errors and deterministic concurrency behavior. |

## Ripple effects and out of scope

Manual retry, GitHub API changes, branch-protection policy, and unrelated sync redesign are out of scope. Existing inherited GUI/provider failures must be reported, not weakened.
