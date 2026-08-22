# GUI-112 files map

## Implementation files

| File | Planned change | Risk / proof |
|---|---|---|
| `apps/gui/src/main/index.ts` | Preflight against the cached live branch before choosing protected vs ordinary rename; accept an exact requested-branch handoff, preserve unexpected-branch refusal, make unavailable board-root failures retryable, and keep timer/sync state coherent. | Highest risk: branch preference, paused state, and sync mutation ordering. Cover with focused production-caller and helper tests. |
| `apps/gui/src/main/kanmerGit.ts` | Extend the existing status/reconciliation seam only as needed for exact cached-vs-destination inspection and failed-worktree status preservation. | Must retain protected-default refusal, custom push-before-delete, retained remote ref, and live mismatch fail-closed behavior. |
| `apps/gui/src/main/kanmerGit.test.ts` | Add ordinary custom rename regression and exact handoff/unexpected branch assertions. | Real-Git fixture must prove refs/worktree state, not merely return values. |
| `apps/gui/src/main/index.sync.test.ts` | Add Retry/reconciliation and paused-state production-caller regressions. | Proves no `syncBoard` call or ref mutation before a safe live branch is established. |
| `apps/gui/src/main/connect.ts` | Pass the saved board branch into GUI-created MCP server invocations. | Must preserve argv-safe portable registration and existing Codex/Claude behavior. |
| `apps/gui/src/main/providers.ts` | Make portable invocation builders accept an optional configured branch and include it only where a local MCP process needs it. | Update pure provider tests; do not embed project paths or secrets. |
| `apps/gui/src/main/providers.test.ts` / connect tests | Prove default portable descriptors remain stable and custom branch environment reaches the MCP registration. | Prevents a custom board from appearing mismatched to local agents. |
| `apps/gui/src/renderer/src/components/Settings.tsx` | Explain retained old refs and hosted-variable update/delete sequence; show protected reconciliation errors even when Git setup is unavailable. | User-visible wording and state branching must not hide genuine failures. |
| `.github/workflows/pr.yml` / `scripts/pr-workflow.test.mjs` | Keep the configured `KANMER_BOARD_BRANCH` source-of-truth and static assertions; no live Actions mutation. | Static proof only; hosted branch protection/variable state remains INCONCLUSIVE. |
| `scripts/agents-block-body.mjs`, `AGENTS.md`, setup-skill mirror | State the custom rename retained-ref handoff and local MCP branch convention in the managed instructions. | Generated copies must remain byte-consistent with the checked-in source. |
| `docs/functional/frd/FRD-020-board-git-worktree-sync.md` | Clarify R5: every custom rename requires variable retarget before old-ref deletion; GUI retains old ref. | Governing-doc contract must match code and manual. |
| `docs/manual/board-sync.md`, `docs/manual/settings.md`, `docs/manual/troubleshooting.md`, generated manual | Align all user instructions with protected/default refusal, custom retained refs, hosted variable update, and visible reconciliation failure. | Regenerate rather than hand-edit generated output. |

## Context files

| Context | Why it matters |
|---|---|
| `docs/architecture/adr/ADR-0016-compiled-workflow.md` | GitHub protection remains merge physics; no GitHub App/API belongs in this ticket. |
| CORE-043 research/plan/report and scratch/review | Existing protected-default, paused-sync, workflow-variable, and external INCONCLUSIVE boundaries are inherited. |
| CORE-080/084 packets | Manual Retry live-preflight and production-caller behavior are already implemented and must not regress. |
| `apps/gui/src/main/syncBranch.ts`, `syncTimer.ts` | Paired live-branch predicate and timer gate are the shared safety seams. |
| `packages/mcp-server/src/index.ts` | `get_status` derives expected branch from `KANMER_BOARD_BRANCH`; GUI invocation env must match it. |
| `plugins/kanmer/skills/kanmer-setup/SKILL.md` | Mirrored managed instructions must stay synchronized with `scripts/agents-block-body.mjs`. |

## Deliberately out of scope

- GitHub API/App, branch-protection mutation, or Actions-variable mutation.
- CORE-043 source branch edits or merging/reviewing CORE-043.
- CORE-081/CORE-085 source-cache work, MCP server behavior beyond receiving the configured env, new packages, and provider feature work.
- Hosted proof of protection/variable retargeting; record it as INCONCLUSIVE.
