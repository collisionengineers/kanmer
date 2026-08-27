# Files — CORE-113

## Where the change lands

| Path | Why |
|---|---|
| `packages/core/src/reconciliation.ts` (new) | Define typed evidence, finding/action codes and deterministic dry-run classification; must remain pure and free of shell/GitHub dependencies. |
| `packages/core/src/reconciliation.test.ts` (new) | Fixture every required invalid-state and safety route, including no mutation on dry-run and stale-action conflict. |
| `packages/core/src/types.ts` | Add only the serialisable reconciliation request/result/action shapes needed by store and MCP; avoid prematurely adding CORE-114/115 identity or lease fields. |
| `packages/core/src/store.ts` | Read the selected ticket/documents and apply only the whitelisted still-current board mutation through existing gate/CAS paths; never delete a worktree or touch the board worktree. |
| `packages/core/src/index.ts` | Export the new core reconciliation API. |
| `packages/mcp-server/src/reconciliation.ts` (new) | Collect bounded project-local Git/PR/check/worktree facts with fixed commands and test seams; classify unavailable GitHub/CI as inconclusive evidence. |
| `packages/mcp-server/src/index.ts` | Register a read-only dry-run tool and explicit guarded apply path with central expected-project protection; no request-provided command or root. |
| `packages/mcp-server/src/reconciliation.test.mjs` or existing source-level test harness | Exercise collector failures, exact tool schemas and apply/CAS behavior without live GitHub credentials. |
| `packages/mcp-server/src/smoke.mjs` | Include the new tool in the isolated MCP handshake/smoke contract and update its fixed tool count. |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | Keep the agent-facing MCP tool roster synchronized with the registered surface. |
| `AGENTS.md` | Update the documented MCP tool list because this PR adds an agent command convention. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Regenerated shipped plugin bundle required by `npm run plugin:check`. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `docs/functional/frd/FRD-028-rescue-and-reconciliation.md` | The approved safety envelope and exact recovery scenarios; it is the source of truth over a convenient implementation shortcut. |
| `docs/architecture/adr/ADR-0021-stable-control-plane-for-candidate-work.md` | Candidate work cannot become live-board authority; reconciliation must preserve the released stable control plane. |
| `packages/core/src/merge-gate.ts` | The established pure-policy/host-evidence split and structured pass/fail finding design. |
| `packages/core/src/store.ts` | Existing CAS, gate, activity and worktree guard behaviors that apply must reuse rather than duplicate. |
| `packages/core/src/types.ts` | The board/item frontmatter model and the correct place for serialisable public types. |
| `packages/mcp-server/src/execution-packet.ts` | Fixed-argument Git execution, path canonicalisation and fail-closed workspace safety precedent. |
| `packages/mcp-server/src/index.ts` | Central tool registration, read/write annotations and expected-project guard mechanics. |
| `packages/mcp-server/src/check-pr.mjs` and `packages/core/src/merge-gate.ts` | Existing CI-side fact collection and pure evaluation integration. |
| `packages/mcp-server/src/smoke.mjs` | Isolated protocol/handshake conventions and canonical expected tool count. |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | The plugin-sync source of truth for tool names; a new registered tool must appear here. |

## Ripple effects

- Core and MCP tests, standalone build, plugin bundle and `plugin:check` must all remain coherent.
- The GUI should not receive a recovery UI in this ticket; it can consume the MCP surface later if a separately scoped ticket needs it.
- The release/CI workflow uses the board and merge gate but does not gain arbitrary recovery authority.
- Existing claims remain backward-compatible inputs; renewable lease schema and delivery/release records remain owned by CORE-115 and CORE-116.

## Out of scope

- Logical `project_id`, revision protocol replacement, leases, batch ownership, configurable delivery policy, release channel state, quick captures, step packets, durable controller orchestration, named multi-project registry and GUI health UI.
- A new board stage, database, scheduler, generic provider framework, request-selected filesystem path, automatic deletion/force-push, automatic required-check bypass, or live candidate control-plane promotion.
- Reconciling unrelated older Review/Verifying tickets outside the caller-selected ticket/scope.

## Post-delta replan file additions

| Path | Why this delta needs it |
| --- | --- |
| `packages/mcp-server/package.json` | Add the existing `src/reconciliation.test.mjs` suite to `test:http`, so normal `npm test` and `npm run verify` execute collector/re-collection tests. |
| `packages/mcp-server/src/git-reachability.mjs` | Reuse or narrowly extend the established fixed-argv ancestry helper for recorded-commit-to-merge-target evidence; do not add a parallel shell runner. |

The existing rows for core reconciliation/types/store, MCP reconciliation/index/tests/smoke, plugin bundle, AGENTS/tool reference already cover the remaining affected files. No package lockfile or dependency change is expected.
