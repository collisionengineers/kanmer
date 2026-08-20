# Open questions — MCP-020

All process-launch and authorization decisions are resolved. These are load-bearing because the surface may be reachable through remote HTTP/tunnels.

- [x] **Is dispatch enabled by default?** — No. The MCP server advertises the capability/policy but `dispatch_task` refuses until an operator explicitly enables it.
- [x] **Is bearer-token authentication enough?** — No. Dispatch has a separate server-side policy: enablement, provider/task allowlists, concurrency/timeout limits and approval mode.
- [x] **What approval modes exist?** — `elicit` and `preapproved`. `elicit` requires advertised capability plus accepted confirmation; absence, error, cancel or decline refuses. `preapproved` means the operator’s explicit policy is the approval. There is no fail-open mode.
- [x] **What may the caller choose?** — Existing ticket id, one shared dispatch-provider id, one `DISPATCH_TASKS` id and an optional bounded timeout. No prompt, command, args, cwd, env, executable, shell, log path or arbitrary model setting.
- [x] **Which providers are eligible?** — Only providers present in the shared dispatch registry and operator allowlist. Antigravity remains unavailable until MCP-015 establishes binding and updates the SSOT.
- [x] **Which tasks are eligible?** — Only core `DISPATCH_TASKS` ids that pass `taskFeasibility` and the operator task allowlist.
- [x] **How is project safety enforced?** — Use the server’s one resolved project/store and MCP-022 optional `expected_project` before any spawn/cancel. A caller cannot name another root.
- [x] **How is occupancy/concurrency enforced?** — Refuse archived/non-ticket/taken tickets, duplicate project+ticket runs, and runs beyond bounded server/project maximum. Dispatch does not take the ticket or create a worktree; task skill behavior remains unchanged.
- [x] **How many MCP tools?** — Exactly three: `dispatch_task`, `list_dispatches`, `cancel_dispatch`. A caller does not need a generic action language or raw-log tool.
- [x] **What does list/status return remotely?** — Sanitized metadata for active and bounded recent terminal runs. No raw output tail, local log path, environment, command line or secrets.
- [x] **How long are terminal runs retained?** — Bounded in memory (fixed count/age chosen and tested), cleared on server restart. Durable queue/run history is deferred.
- [x] **Who may cancel?** — Any client authorized by the same enabled server/project policy can cancel an active id for that project; requester identity is recorded. There is no cross-project id lookup or force process command.
- [x] **How are provider/task definitions shared?** — Move dispatch-only metadata to core and make GUI/MCP consume it. Keep Connect registration/install in GUI.
- [x] **How is process supervision shared?** — Extract one reusable supervisor/state machine with injected GUI/MCP adapters. Separate processes instantiate it, but state transitions, locking, timeout and tree-kill logic are not duplicated.
- [x] **What happens if terminal scratch recording fails?** — Preserve `recordingError` in terminal status and emit/log it; never swallow and claim the run was recorded.
- [x] **Are raw logs remotely retrievable?** — No. Local diagnostics remain local; future secure log access requires a separate observed need/threat review.
- [x] **Does cancellation count as a write for expected-project purposes?** — Yes. It changes local process state and must validate the optional project token before action.

## Parked (explicitly deferred)

- [ ] Durable dispatch/run records across restart — defer to a measured recovery/audit need; SKILL-016 owns auto-run board state, not this queue.
- [ ] Per-user roles/scopes beyond endpoint token + operator policy — defer until a multi-user remote deployment exists.
- [ ] Streaming raw output over MCP — defer because of secret/data leakage risk.
- [ ] Automatic retries/scheduling/provider fallback — defer; one requested bounded task is the approved contract.
