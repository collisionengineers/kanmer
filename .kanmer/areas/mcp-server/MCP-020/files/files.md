# Files — MCP-020

## New shared dispatch modules

| Path | Required change |
|---|---|
| `packages/core/src/dispatch-providers.ts` | **Add.** Dispatch-only provider ids/labels/CLI/args builders and lookup/list helpers. This is the single source consumed by GUI and MCP; exclude Connect registration, skill installation and Electron paths. Antigravity remains absent/disabled until MCP-015. |
| `packages/core/src/dispatch-supervisor.ts` | **Add.** Reusable Node-side process lifecycle: project+ticket lock, server concurrency, bounded timeout, spawn/error/close/cancel, descendant kill, local log, bounded recent terminal statuses, status sink and terminal audit recorder. Accept injected log directory/spawn/clock/recorder for GUI/MCP/tests. |
| `packages/core/src/dispatch-supervisor.test.ts` | **Add.** Deterministic process/states/concurrency/cancel/timeout/recent-history/record-failure tests with fake children; never launch real provider CLIs. |
| `packages/mcp-server/src/dispatch-policy.ts` | **Add.** Parse and validate operator-controlled enablement, provider/task allowlists, max-active, timeout bounds and approval mode. Produce a sanitized status block and stable refusal reasons. No caller-supplied process fields. |
| `packages/mcp-server/src/dispatch-policy.test.ts` or smoke fixture | **Add if package test runner is introduced by the implementation rail.** Cover default-disabled, malformed, allowlist, timeout and approval modes. Otherwise place pure assertions in existing smoke scripts. |

## Existing files to modify

| Path | Required change |
|---|---|
| `packages/core/src/index.ts` | Export the new Node dispatch modules from the normal core entry. CORE-027’s later browser-safe subpath must deliberately exclude them. |
| `packages/core/src/prompts.ts` | Keep named tasks/feasibility as SSOT. Change only if the MCP start contract requires a pure exported task enum/list helper; do not duplicate prompts. |
| `apps/gui/src/main/providers.ts` | Consume shared dispatch-provider metadata instead of owning a second CLI/args/dispatchable list. Retain all Connect registration/install definitions and ProviderId compatibility. |
| `apps/gui/src/main/dispatch.ts` | Replace local process state machine with one GUI-configured `DispatchSupervisor` using `app.getPath("userData")`, renderer status sink and ticket scratch recorder. Preserve exported GUI functions/IPC behavior where possible. |
| `apps/gui/src/main/dispatch.test.ts` | Pin GUI adapter behavior, source-root/log/recorder wiring and existing same-ticket/different-project semantics while supervisor tests own lifecycle details. |
| `apps/gui/src/shared/ipc.ts` | Reuse/import shared status types or map explicitly; add requester/endedAt/reason/recordingError/recent state only when required by the shared contract. Keep renderer-safe type-only imports. |
| `packages/mcp-server/src/index.ts` | Instantiate supervisor once with repo-root/log policy; expose policy in `get_status`; register `dispatch_task`, `list_dispatches`, `cancel_dispatch`; validate `expected_project` through MCP-022 helper before side effects; fail-closed approval; sanitize status; set actor attribution. |
| `packages/mcp-server/src/smoke.mjs` | Test default-disabled refusal, preapproved success with fake provider/spawn seam, named task/provider only, wrong-project, missing/taken/archived/duplicate/max-active, feasibility, list/recent terminal status, cancel, timeout and audit record behavior. |
| `packages/mcp-server/src/smoke-protocol.mjs` | Verify raw JSON-RPC schemas/annotations and structured refusal/error shape for the three tools. Ensure remote output omits raw tail/log path/secrets. |
| `packages/mcp-server/src/smoke-discovery.mjs` | Confirm standalone/plugin discovery exposes the same new tool roster and no duplicate tool names. |
| `packages/mcp-server/package.json` | Add only runtime dependency needed by the shared/standalone spawn path if not bundled through core (prefer moving existing `cross-spawn` ownership to core rather than two copies). Update scripts only for a real test target. |
| `packages/core/package.json` | If the shared supervisor owns `cross-spawn`, add it as a runtime dependency and matching type dev dependency; remove the GUI-only duplicate after all consumers import the shared module. No unrelated dependency. |
| `apps/gui/package.json` | Remove direct `cross-spawn` ownership only when no GUI module imports it after extraction. |
| `plugins/kanmer/tool-reference.md` | Add three tool rows above field semantics; document policy/approval, fixed enums, sanitized status, optional expected project and exact refusal codes/repairs. Reconcile total tool count (expected 34 after MCP-023, but derive from actual registry). |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Regenerate from the normal main checkout after tool/runtime changes. |
| `docs/functional/frd/FRD-010-task-scoped-dispatch.md` | Extend GUI-only dispatch into one shared GUI/MCP contract: policy, approval, audit, task feasibility, status/cancel and non-goals. |
| `docs/functional/frd/FRD-022-mcp-server-surface.md` | Add the exact three tools, schemas, annotations, project binding, policy status block and tool count. |
| `docs/manual/` remote/dispatch source and generated manual | Explain local opt-in, preapproved vs elicited mode, allowlists, safe status/cancel and why auth alone does not permit launch. Regenerate through the manual script. |
| Relevant Kanmer skills/tool prose | Reference named dispatch tools only where the existing skill explains MCP capability; do not duplicate policy tables or task prompts. |

## Shared types/contracts

The shared supervisor status must include at least:

```text
dispatchId, projectId/fingerprint, ticketId, provider, task,
deliverable, requestedBy, state, startedAt, endedAt?, exitCode?,
reason?, recordingError?
```

GUI may receive a bounded tail through its local adapter. MCP responses must omit full tail, local log path, environment and command line.

## Runtime configuration

Use one documented policy namespace (exact names chosen once in implementation), expected contract:

```text
KANMER_DISPATCH_ENABLED=false by default
KANMER_DISPATCH_PROVIDERS=<comma-separated shared provider ids>
KANMER_DISPATCH_TASKS=<comma-separated DISPATCH_TASKS ids>
KANMER_DISPATCH_MAX_ACTIVE=1..bounded
KANMER_DISPATCH_TIMEOUT_MS=<bounded default/max>
KANMER_DISPATCH_APPROVAL=elicit|preapproved
```

Invalid/missing opt-in refuses start; it never broadens to all providers/tasks silently.

## Ripple effects

- GUI and MCP now share provider/task/supervisor semantics but maintain separate in-memory process instances because they are separate OS processes.
- `get_status` gains a sanitized dispatch capability/policy block.
- Three MCP tools change plugin bytes, discovery and docs.
- Remote HTTP auth still gates endpoint access; dispatch policy is an additional authorization boundary.
- Completed/failed/cancelled/timed-out statuses remain in a bounded in-memory recent list until restart; durable queue/history is out of scope.
- Ticket scratch receives one bounded terminal record with requester/provider/task/result. Record failure remains visible.

## Do not modify

- Accept arbitrary command, args, prompt, cwd, env, shell text or log path from MCP.
- Enable dispatch by default or treat bearer authentication as dispatch authorization.
- Add durable queues, leases, retries, scheduling, raw log download, background auto, new tasks/providers or remote shell.
- Change Connect provider registration/install behavior, MCP HTTP/auth implementation, ticket gates or worktree creation.
- Make the supervisor browser-safe; CORE-027 owns a separate browser subpath.
