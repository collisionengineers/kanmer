# GUI-112 files map

## Implementation files

| File | Planned change | Risk / proof |
|---|---|---|
| `apps/gui/src/main/index.ts` | Preflight against the cached live branch before choosing protected vs ordinary rename; accept an exact requested-branch handoff, preserve unexpected-branch refusal, make unavailable board-root failures retryable, and keep timer/sync state coherent. | Highest risk: branch preference, paused state, and sync mutation ordering. Cover with focused production-caller and helper tests. |
| `apps/gui/src/main/kanmerGit.ts` | Extend the existing status/reconciliation seam only as needed for exact cached-vs-destination inspection and failed-worktree status preservation. | Must retain protected-default refusal, custom push-before-delete, retained remote ref, and live mismatch fail-closed behavior. |
| `apps/gui/src/main/kanmerGit.test.ts` | Add ordinary custom rename regression and exact handoff/unexpected branch assertions. | Real-Git fixture must prove refs/worktree state, not merely return values. |
| `apps/gui/src/main/index.sync.test.ts` | Add Retry/reconciliation and paused-state production-caller regressions. | Proves no `syncBoard` call or ref mutation before a safe live branch is established. |
| `apps/gui/src/renderer/src/components/Settings.tsx` | Explain retained old refs and hosted-variable update/delete sequence; show protected reconciliation errors even when Git setup is unavailable. | User-visible wording and state branching must not hide genuine failures. |
| `.github/workflows/pr.yml` / `scripts/pr-workflow.test.mjs` | Keep the configured `KANMER_BOARD_BRANCH` source-of-truth and static assertions; no live Actions mutation. | Static proof only; hosted branch protection/variable state remains INCONCLUSIVE. |
| `docs/functional/frd/FRD-020-board-git-worktree-sync.md` | Clarify R5: every custom rename requires variable retarget before old-ref deletion; GUI retains old ref. | Governing-doc contract must match code and manual. |
| `docs/manual/board-sync.md`, `docs/manual/settings.md`, `docs/manual/troubleshooting.md`, generated manual | Align all user instructions with protected/default refusal, custom retained refs, hosted variable update, and visible reconciliation failure. | Regenerate rather than hand-edit generated output. |

## Context files

| Context | Why it matters |
|---|---|
| `docs/architecture/adr/ADR-0016-compiled-workflow.md` | GitHub protection remains merge physics; no GitHub App/API belongs in this ticket. |
| CORE-043 research/plan/report and scratch/review | Existing protected-default, paused-sync, workflow-variable, and external INCONCLUSIVE boundaries are inherited. |
| CORE-080/084 packets | Manual Retry live-preflight and production-caller behavior are already implemented and must not regress. |
| `apps/gui/src/main/syncBranch.ts`, `syncTimer.ts` | Paired live-branch predicate and timer gate are the shared safety seams. |
| linked MCP-044 packet | Owns managed AGENTS source and GUI/provider-to-MCP branch propagation; GUI-112 does not duplicate it. |

## Deliberately out of scope

- GitHub API/App, branch-protection or Actions-variable mutation.
- Managed AGENTS/MCP runtime propagation (linked MCP-044).
- CORE-043 source branch edits or merging/reviewing CORE-043.
- CORE-081/CORE-085 source-cache work, new packages, and provider feature work.
- Hosted proof of protection/variable retargeting; record it as INCONCLUSIVE.
