# Plan — MCP-020: Expose controlled background dispatch through MCP

## Objective

Allow an explicitly authorized MCP client to start one named Kanmer task for one ticket, observe active/recent lifecycle metadata and cancel an active run, while making arbitrary process execution structurally impossible and keeping GUI/MCP on one provider/task/process-supervision contract.

## Starting state

- GUI dispatch is shipped behind Electron IPC in `apps/gui/src/main/dispatch.ts`.
- Core already owns task ids/prompts/feasibility in `prompts.ts`.
- GUI `providers.ts` owns dispatch CLI/args beside unrelated Connect metadata.
- GUI process supervision is Electron-bound and terminal runs disappear from list state.
- The MCP server exposes no dispatch tools and may later be reachable through HTTP bearer auth.
- MCP-022 supplies optional expected-project validation/structured errors; MCP-025/026 supply remote transport/auth. Dispatch authorization remains separate.

## Approach

Extract dispatch-only provider metadata and one injectable process supervisor into Node-side core. Adapt the GUI to it first so current behavior is preserved. Add a fail-closed MCP policy parser, then register exactly three narrow tools that accept only shared provider/task ids and a ticket. Start validates policy, project, ticket, feasibility, occupancy/concurrency and approval before creating a child/log. MCP status is sanitized; terminal audit failures are visible. No caller-controlled process or prompt field exists.

## Governing docs

- **FRD-010 — Modifies.** Extend task-scoped dispatch from GUI-only to shared GUI/MCP behavior, including authorization, status/cancel and fixed prompts.
- **FRD-022 — Modifies.** Add exact tool schemas/annotations/errors/status policy and reconcile actual tool count.
- **MASTERPLAN §6.3 — Meets.** MCP-020 is in 0.4.1 but deliberately outside EPIC-010 because it creates a separate authorization boundary.
- **ADR-0009 — Meets.** Core task/provider/supervisor facts are consumed, not restated in skills/MCP prose.
- **MCP-022/025/026 — Integrates without absorbing.** Use expected-project and authenticated transport when available; do not implement them here.

## Required changes

### 1. Establish shared dispatch provider metadata

1. Add `packages/core/src/dispatch-providers.ts` with a closed `DispatchProviderId` union derived from the actual registry.
2. Define provider records containing only `id`, `label`, `cli` and pure `args(prompt, sourceRoot)`.
3. Include Codex, Claude, OpenCode and Grok with their current exact CLI/args.
4. Exclude Antigravity until MCP-015 establishes project binding; encode the absence in tests.
5. Export `dispatchProviderById`, `listDispatchProviders` and a type guard; return immutable/fresh values.
6. Do not include config paths, marketplace/skills install or registration merge logic.
7. Update core exports and tests for ids, labels, args and unknown refusal.
8. Change GUI `providers.ts` to derive `dispatch`, `dispatchCli` and `dispatchArgs` from the shared record (or expose a shared lookup used by dispatch UI) without changing any Connect fixture.
9. Add a matrix test proving GUI’s dispatchable provider list equals core’s registry exactly.

### 2. Extract one reusable supervisor

10. Add `packages/core/src/dispatch-supervisor.ts` with no Electron import.
11. Define inputs/interfaces for project id/fingerprint, source root, ticket, provider, task, requester, timeout, log directory, spawn, tree kill, status sink and terminal recorder.
12. Define shared states: `running`, `done`, `failed`, `cancelled`, `timed-out`.
13. Define status fields from `files.md`; keep raw tail/log path on an internal/local view separate from the sanitized public status.
14. Maintain active handles keyed by globally unique unpredictable dispatch id and a secondary project+ticket lock.
15. Generate ids using `crypto.randomUUID()` (optionally prefixed with ticket id for local readability); do not use a process-local counter as the uniqueness basis.
16. Enforce one active run per project+ticket inside the supervisor even if a caller missed prevalidation.
17. Enforce a supplied max-active limit atomically before spawn.
18. Create the log directory/file only after all policy/ticket/approval validation and immediately before spawn.
19. Spawn the fixed provider CLI with fixed args, `cwd: sourceRoot`, inherited process environment, hidden window and a detached process group only where required for POSIX descendant kill.
20. Preserve current cross-platform CLI behavior by owning `cross-spawn` once in the shared Node module if native spawn is insufficient on Windows.
21. Capture stdout/stderr to one local file and bounded local tail; cap line count/bytes.
22. On synchronous spawn failure, close/remove pending handle/log cleanly and return a stable actionable error.
23. On child `error`, transition exactly once to failed, clear timeout/locks, close log, record terminal state and emit it.
24. On timeout, set timed-out reason before tree kill and let close finalize exactly once.
25. On cancel, set cancelled/requester/reason then tree-kill; return false/not-found for non-active ids.
26. Use `execFile("taskkill", ["/pid", pid, "/T", "/F"])` on Windows and process-group SIGTERM with bounded escalation/fallback on POSIX; no interpolated shell.
27. On normal close, map exit 0/non-zero unless state was already cancelled/timed-out.
28. Remove active locks on every terminal path.
29. Retain terminal sanitized statuses in a bounded fixed-size/age recent map; evict deterministically and clear on restart.
30. Call the injected terminal recorder once with a bounded summary including requester/provider/task/result/duration and safe tail.
31. If recording fails, set/emit `recordingError`; log to stderr/local diagnostics rather than swallowing.
32. Expose list/filter and active cancellation methods; do not expose arbitrary log reading.
33. Add exhaustive fake-child tests for all transitions, duplicate/max concurrency, different projects, timeout, cancel, descendant kill seam, recorder failure, terminal retention/eviction and double-event races.

### 3. Adapt the existing GUI

34. Replace GUI’s local maps/counter/tree-kill/state machine with one supervisor instance configured after Electron app paths are available.
35. Supply `app.getPath("userData")/dispatch` as local log directory.
36. Map supervisor status to existing renderer `DispatchStatus`, including bounded tail only for the local GUI.
37. Supply a terminal recorder using `store.appendScratch(ticketId, "dispatch", summary)` and preserve any write error in status.
38. Preserve public GUI functions/IPC: dispatch, list per project, cancel, kill all and status subscription.
39. Preserve source-root requirement, named task fallback behavior used by existing callers and no worktree creation.
40. Keep provider/taken/ticket/task feasibility validation either in a shared start service or adapter, with no behavioral regression.
41. Update GUI tests to focus on adapter/project scoping and add a regression for terminal history if the drawer uses it.
42. Run all existing provider/dispatch/renderer tests before adding MCP tools.

### 4. Define fail-closed MCP dispatch policy

43. Add `packages/mcp-server/src/dispatch-policy.ts` with a pure parser reading one documented environment/config namespace.
44. Default to `enabled:false`, empty provider/task allowlists and no process launch.
45. Require explicit boolean enablement; invalid values produce disabled+configuration-error, not permissive fallback.
46. Parse provider ids against the shared registry and task ids against `DISPATCH_TASKS`; reject unknown/empty configured entries visibly.
47. Parse `maxActive` within a small bounded range (default 1 when enabled; hard maximum documented/tested).
48. Parse default and maximum timeout within documented bounds; a requested timeout is clamped/refused according to one tested rule (prefer refusal above max).
49. Parse approval exactly `elicit` or `preapproved`; missing/invalid approval keeps dispatch disabled.
50. Export a sanitized policy/status block for `get_status`: enabled, approval mode, allowed providers/tasks, maxActive, default/max timeout and active count; no command/env/log paths.
51. Add pure tests/default-invalid/allowlist/bounds coverage through package tests or MCP smoke.

### 5. Instantiate the MCP supervisor safely

52. Instantiate one supervisor after root/repo resolution using a local OS/user-state log directory that is outside the board/repository and created with user-only permissions where supported.
53. Use the same shared provider registry and task prompts/feasibility.
54. Supply a terminal recorder that sets actor/requester context explicitly and appends one bounded scratch record; do not rely on a later unrelated request’s global actor.
55. Include project fingerprint from MCP-022 in status when available; otherwise use resolved local project identity internally and compatibility-advertise appropriately.
56. Add `get_status.dispatch` with sanitized policy and active/recent counts.
57. Ensure server shutdown kills/cleans active child trees through registered signal/close handling; no orphan CLI on stdio/HTTP exit.

### 6. Register `dispatch_task`

58. Add input schema:
    - `id`: ticket id;
    - `provider`: shared provider enum/string validated by registry;
    - `task`: core task id;
    - `timeout_ms`: optional bounded integer;
    - optional `expected_project` through MCP-022’s shared schema helper.
59. Mark the tool mutating/non-idempotent and describe the explicit operator opt-in/approval boundary.
60. Before any log/spawn, validate expected project.
61. Refuse unless policy is enabled/config-valid.
62. Refuse provider/task not in both shared registry and operator allowlists.
63. Load the item read-only and require existing non-archived ticket.
64. Refuse a ticket with `taken_at`, an active duplicate or exhausted max concurrency.
65. Load docs/gates/stage counts and run core `taskFeasibility`; include its exact reason/warning.
66. Resolve prompt only from `dispatchTaskById`; caller input never enters prompt text except validated ticket id.
67. Resolve source cwd from server `repoRoot`/canonical source root, never board worktree and never caller input.
68. In approval `elicit`, require client capability and a successful accepted confirmation naming project/ticket/provider/task/timeout. Any absence/error/cancel/decline returns refusal.
69. In `preapproved`, proceed only because the explicit policy already names provider/task; include approval mode in the result/audit.
70. Start through the supervisor with requester from `actorName(extra)` and return sanitized status/deliverable/warning.
71. Use structured errors/refusals consistent with MCP-022; do not leak process command/env/path.

### 7. Register `list_dispatches` and `cancel_dispatch`

72. `list_dispatches` is read-only with optional ticket/state filters and `include_recent` default true.
73. Return sanitized active and bounded recent metadata for this server/project only; omit tail/log/command/env.
74. Include policy-disabled state rather than pretending no feature exists.
75. `cancel_dispatch` accepts dispatch id, optional reason with strict short length/no shell use, and optional expected project.
76. Validate expected project and enabled policy before cancellation.
77. Refuse unknown/non-active/other-project ids with stable not-found/refusal; never call a pid supplied by the client.
78. Record cancelling actor/reason, invoke supervisor cancellation and return sanitized terminal/in-progress state.
79. Mark cancellation mutating and idempotent only for one active id as documented.

### 8. Documentation, bundle and tests

80. Extend FRD-010 with shared contract, policy/approval, tools, recent status, audit and explicit no-arbitrary-process non-goals.
81. Extend FRD-022 with exact three tool rows/schemas/annotations/status block/errors and reconcile count from actual registry (expected 34 after MCP-023).
82. Update manual with enablement examples that use allowlisted ids and warn that bearer auth alone does not authorize launch.
83. Update tool reference above `## Field semantics`; document optional expected-project, sanitized output and no raw logs.
84. Extend MCP smoke using injected fake spawn/supervisor adapter so CI never invokes real agents.
85. Cover disabled/default, malformed policy, allowlists, approval absence/decline/failure/acceptance, preapproved start, wrong project, invalid/taken/archived/duplicate/max concurrency, infeasible task, timeout, terminal list, cancel and audit-record failure.
86. In protocol smoke, assert JSON-RPC annotations/schema and no tail/log/command/env in remote output.
87. Assert GUI and MCP provider/task rosters equal core SSOT and Antigravity remains absent until MCP-015.
88. Run typecheck/build/tests, stdio/protocol/discovery smokes and plugin/reference sync.
89. Rebuild the plugin from the normal main checkout and commit generated bytes.
90. Perform one controlled local/manual MCP client run with `preapproved`/fake or safe provider, then cancel; never point tests at an unreviewed remote endpoint.

## Expected files

Add:
- `packages/core/src/dispatch-providers.ts`
- `packages/core/src/dispatch-supervisor.ts`
- `packages/core/src/dispatch-supervisor.test.ts`
- `packages/mcp-server/src/dispatch-policy.ts`
- policy tests if supported

Modify the exact files listed in `files.md`, including GUI adapter/tests, MCP registry/smokes, package dependencies, FRD/manual/tool reference and generated plugin bundle.

## Do not modify

- Accept arbitrary execution fields or enable by default.
- Implement HTTP/auth/tunnel, durable queue, retries, auto orchestration, raw remote logs, role system or worktree creation.
- Change Connect registration/skills behavior, ticket gates or provider task prompts outside shared SSOT needs.
- Begin MCP-014.

## Acceptance checks

- GUI behavior remains green while sharing provider/supervisor contract.
- MCP default/invalid policy cannot spawn.
- Only operator-allowlisted shared provider/task ids can start.
- Expected project, ticket state, feasibility, duplicate/max concurrency and fail-closed approval precede spawn/log creation.
- Start/list/cancel work with fake/controlled child and safe sanitized responses.
- Timeout/cancel kill descendants and terminal states/audit errors remain observable.
- No caller-controlled command/prompt/root/env/log field exists.
- FRDs/manual/tool reference/registry/plugin bytes and tool count are synchronized.

## Verification commands

```bash
npm run test -w @kanmer/core
npm run test -w @kanmer/gui
npm run typecheck
npm run build
node packages/mcp-server/src/smoke.mjs
npm run smoke:protocol
npm run smoke:discovery
npm run check:manual
npm run verify:skills
```

From normal main checkout:

```bash
npm run build
npm run plugin:build
npm run plugin:check
git diff --check
git status --short
```

## Failure and deviation rules

- If MCP-022 expected-project helpers are unavailable, stop or land after it; do not create a competing project-token implementation.
- If sharing the supervisor would require Electron in core/MCP, correct the injection boundary rather than import GUI code.
- If a client lacks elicitation in `elicit` mode, refuse; never downgrade to preapproved automatically.
- If provider launch metadata cannot be shared without Connect regressions, split dispatch-only metadata more narrowly; do not duplicate it.
- If terminal audit write fails, surface the failure and retain run status.
- Do not merge or start MCP-014.

## Stop condition

Stop when the GUI and MCP consume one dispatch provider/task/supervisor contract; the three tools are default-off, policy/approval/project bound and fully smoke-tested; remote output is sanitized; audit failures surface; docs/reference/plugin are synchronized; and the PR is ready for independent security review. Do not merge, enable remote production dispatch or begin another ticket.
