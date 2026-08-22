# Files map — CORE-062

## Change surface

| File | Expected change | Risk / proof |
|---|---|---|
| `apps/gui/src/main/kanmerGit.ts` | Reconcile `BOARD_WORKTREE_IGNORE` on local and remote branch attachment paths through one shared success path. | Missing an early return can reintroduce cache tracking; prove with real Git fixtures. |
| `apps/gui/src/main/kanmerGit.test.ts` | Add local-branch and remote-branch attachment tests asserting the sources rule before sync. | Exercises both previously uncovered paths without mocks. |
| `docs/functional/frd/FRD-027-project-declared-sources.md` / `docs/architecture/adr/ADR-0020-project-declared-source-trust.md` | Read as governing context; no change expected unless the implementation reveals a contradiction. | Keep scope tied to existing cache-trust requirements. |

## Context files

| File | Why it matters |
|---|---|
| `apps/gui/src/main/kanmerGit.ts` | Owns all board worktree creation, attachment, ignore reconciliation, and sync staging. |
| `apps/gui/src/main/kanmerGit.test.ts` | Real bare-origin fixture and path-identity helpers for deterministic coverage. |
| `docs/functional/frd/FRD-020-board-git-worktree-sync.md` | Requires scoped board-only staging and no derived activity/cache history. |
| `docs/functional/frd/FRD-027-project-declared-sources.md` | Defines derived source-cache storage and trust boundaries. |
| `AGENTS.md` | Requires concurrency results and errors to surface; no silent cache loss. |

## Ripple effects and out of scope

The committed plugin artifact, remote DNS source fetch, and retroactive untracking of cache files already in Git remain outside this focused reconciliation ticket.
