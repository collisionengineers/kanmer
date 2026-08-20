# Research — MCP-020: controlled background dispatch through MCP

## Question

How can an MCP client start, observe and cancel Kanmer’s existing task-scoped background agents without exposing arbitrary process execution, duplicating GUI supervision, weakening project boundaries or treating remote authentication as sufficient authorization?

## Current implementation

- Background dispatch exists in `apps/gui/src/main/dispatch.ts`. It validates provider capability, refuses duplicate project+ticket runs and already-taken tickets, resolves a named task from core, builds a fixed prompt, spawns the provider CLI at the source root, captures a bounded tail/log, enforces a timeout, tree-kills on cancel/quit and appends one terminal summary to ticket scratch.
- The in-memory `active` and `activeByProjectTicket` maps disappear when a process terminates. GUI listeners receive terminal state, but `listDispatches()` returns only in-flight handles after cleanup; an MCP status/list tool therefore needs a bounded recent-terminal record.
- The generic task catalogue, prompt text and feasibility function already live in `packages/core/src/prompts.ts`. This is the correct source of named task ids, labels, deliverables and gate-aware enablement. No MCP caller may supply its own prompt.
- Provider launch metadata (`dispatch`, CLI, args builder) currently lives inside GUI-only `providers.ts`, mixed with Connect registration/install concerns. Importing the GUI module into the MCP server would pull Electron/main-process dependencies and invert package ownership.
- The current process supervisor also imports Electron `app.getPath()` and `cross-spawn`, so it cannot be reused by the standalone MCP server as written.
- MCP writes are project-scoped through one resolved `KanmerStore`; MCP-022 adds `expected_project` and `WRONG_PROJECT`. Dispatch start/cancel are side effects and should use the same optional project fingerprint/capability sniffing even though they do not write ticket frontmatter directly.
- HTTP bearer authentication from MCP-026 answers “who possesses the endpoint token,” not “may this endpoint launch local executables.” Dispatch therefore requires a separate explicit operator policy and defaults off.
- Existing destructive elicitation fails open when a client lacks/cannot complete elicitation. That behavior is unsuitable for process launch. Dispatch approval must be fail-closed: either an operator deliberately configures pre-approval or every start requires a successful elicitation round trip.
- Provider/task allowlists and bounded concurrency must be server-side. Accepting `command`, `args`, `prompt`, `cwd`, environment or log path from a tool call would turn Kanmer into a remote command runner.
- The provider list currently includes Codex, Claude, OpenCode and Grok as dispatchable; Antigravity remains non-dispatchable until MCP-015 supplies project binding. MCP dispatch must consume the same dispatch-provider SSOT so GUI/MCP cannot disagree.
- Cancellation on Windows currently uses an interpolated `exec("taskkill ...")`. The pid is numeric, but the shared runner should use `execFile("taskkill", ["/pid", ...])` and process groups on POSIX to avoid shell dependence and preserve grandchildren cleanup.
- Raw agent output can contain repository data, credentials or model responses. MCP list/status should return lifecycle metadata and a safe terminal diagnostic, not stream the GUI’s raw tail to remote clients. Full logs remain local; the ticket summary must be bounded and secret-conscious.
- A run must record requester actor, provider, task, project fingerprint, ticket, state, timestamps, timeout/cancel reason and record-write failure. Swallowing `appendScratch` failures makes the audit claim false.
- The MCP server’s tool registry and plugin bundle/reference are generated/checked. Adding three tools requires smoke/protocol/discovery tests, FRD-022 and tool-reference updates, standalone/plugin rebuild from the main checkout and exact tool-count reconciliation.

## Recommended architecture

1. Move dispatch-only provider metadata into a Node-safe core module, consumed by GUI `providers.ts` and the MCP server.
2. Extract a reusable `DispatchSupervisor` into core (or a new internal Node module under core) with injected log directory, status sink, spawn/tree-kill seam and terminal recorder. GUI and MCP instantiate it; neither maintains a second state machine.
3. Keep GUI Connect provider registration outside this module.
4. Add an MCP `dispatch-policy.ts` that parses explicit environment/CLI configuration:
   - disabled by default;
   - allowed providers/tasks;
   - max active per server/project;
   - timeout bounds;
   - approval mode `elicit` or `preapproved`.
5. Add exactly three tools:
   - `dispatch_task` — ticket + named provider + named task + optional bounded timeout + optional expected project;
   - `list_dispatches` — optional ticket/state filters; metadata only, active plus bounded recent terminals;
   - `cancel_dispatch` — project-bound dispatch id + optional expected project.
6. Validate policy, project, ticket, task feasibility, occupancy, duplicate/max concurrency and approval before spawning or creating a log.
7. Attribute requester from MCP client identity and retain status/recording failures.
8. Do not add arbitrary prompt/process/log retrieval, auto-retry, durable queue, cross-server scheduling or dispatch over a different board.

## Security conclusion

The bearer token is necessary but not sufficient. Safe dispatch requires all of: local operator opt-in, fixed SSOT provider/task descriptors, same-project fingerprint, explicit approval mode, allowlists, concurrency/timeout bounds, no caller-controlled process fields, sanitized remote status and auditable cancellation. If any layer is unavailable, start is refused rather than degraded.

## Open questions

None. The exact policy defaults, tool surface and extraction boundary are resolved in `open-questions.md`.
