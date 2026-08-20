# Checklist — MCP-020

## Shared provider contract

- [ ] Add core dispatch-provider id/type/records and immutable lookup/list helpers.
- [ ] Preserve exact Codex, Claude, OpenCode and Grok CLI/args.
- [ ] Keep Antigravity unavailable until MCP-015.
- [ ] Exclude all Connect config/install metadata from the shared registry.
- [ ] Make GUI dispatchability consume the shared registry.
- [ ] Prove GUI and core dispatch provider rosters are identical.
- [ ] Prove every existing Connect/provider fixture remains unchanged.

## Shared supervisor

- [ ] Add an Electron-free injectable `DispatchSupervisor`.
- [ ] Define shared lifecycle/status fields and sanitized/local views.
- [ ] Use random UUID-based dispatch ids.
- [ ] Enforce project+ticket duplicate lock atomically.
- [ ] Enforce bounded max active atomically.
- [ ] Create log only after all caller validation/approval.
- [ ] Spawn fixed shared provider CLI/args at source root.
- [ ] Own `cross-spawn` once if required for Windows CLIs.
- [ ] Capture bounded stdout/stderr locally.
- [ ] Handle synchronous spawn failure without stale lock/log.
- [ ] Handle child error/close exactly once.
- [ ] Implement bounded timeout and state reason.
- [ ] Implement safe descendant cancellation with `execFile`/process groups.
- [ ] Remove all locks/timers on every terminal path.
- [ ] Retain bounded recent terminal metadata and deterministic eviction.
- [ ] Record one bounded terminal ticket summary with requester/provider/task/result.
- [ ] Surface `recordingError` rather than swallowing a failed audit write.
- [ ] Add exhaustive fake-child transition/race/concurrency/timeout/cancel/eviction tests.

## GUI adapter

- [ ] Replace GUI-local state machine/maps/tree-kill with the shared supervisor.
- [ ] Supply Electron user-data log directory.
- [ ] Preserve local renderer tail/status subscription.
- [ ] Preserve source-root requirement and no worktree creation.
- [ ] Preserve dispatch/list/cancel/kill-all IPC contracts.
- [ ] Wire terminal scratch recorder and expose record failure.
- [ ] Run existing GUI dispatch/provider tests green.

## Fail-closed MCP policy

- [ ] Add pure policy parser with one documented configuration namespace.
- [ ] Default disabled with empty allowlists.
- [ ] Refuse malformed enablement rather than broaden it.
- [ ] Validate configured provider ids against shared registry.
- [ ] Validate configured task ids against core task SSOT.
- [ ] Parse bounded max active and default/max timeout.
- [ ] Parse only `elicit` or `preapproved` approval.
- [ ] Keep invalid/missing approval disabled.
- [ ] Expose sanitized policy block in `get_status`.
- [ ] Add default/invalid/allowlist/bounds tests.

## MCP supervisor integration

- [ ] Instantiate one supervisor outside board/repo with user-scoped log storage.
- [ ] Use shared provider/task/prompt/feasibility contracts.
- [ ] Bind statuses to current project identity/fingerprint.
- [ ] Attribute requester explicitly in async terminal recorder.
- [ ] Kill active children on server shutdown/signals.
- [ ] Return no command/env/log path/raw tail remotely.

## `dispatch_task`

- [ ] Register exactly one start tool with ticket/provider/task/optional bounded timeout/expected-project fields.
- [ ] Mark it mutating/non-idempotent with explicit authorization description.
- [ ] Validate expected project before any side effect.
- [ ] Refuse disabled/invalid policy.
- [ ] Refuse provider/task outside registry or operator allowlist.
- [ ] Require existing non-archived ticket.
- [ ] Refuse taken, duplicate and max-active cases.
- [ ] Apply core task feasibility and return exact reason/warning.
- [ ] Resolve prompt only from core named task and validated ticket id.
- [ ] Resolve cwd only from server source root.
- [ ] In `elicit`, require capability and accepted confirmation; fail closed otherwise.
- [ ] In `preapproved`, record that explicit policy authorized the run.
- [ ] Start through supervisor with actor attribution.
- [ ] Return only sanitized status/deliverable/warning.

## List and cancel tools

- [ ] Register read-only `list_dispatches` with ticket/state/recent filters.
- [ ] Return active plus bounded recent statuses for this project only.
- [ ] Include policy-disabled context without leaking internals.
- [ ] Register mutating `cancel_dispatch` with dispatch id, bounded reason and expected project.
- [ ] Validate project/policy before cancel.
- [ ] Refuse unknown/non-active/other-project ids.
- [ ] Never accept/call a client-supplied pid.
- [ ] Record cancelling actor/reason and return sanitized state.

## Documentation, tests and bundle

- [ ] Amend FRD-010 shared GUI/MCP dispatch policy/status/cancel/non-goals.
- [ ] Amend FRD-022 exact three tools/schemas/annotations/errors/status/tool count.
- [ ] Update manual enablement/approval/allowlist/security guidance.
- [ ] Add exactly three tool-reference rows and field semantics.
- [ ] Extend MCP smoke for disabled, malformed, approval, allowlist, project, ticket, duplicate/max, feasibility, timeout, terminal list, cancel and recording failure.
- [ ] Extend protocol smoke and assert no sensitive fields in responses.
- [ ] Extend discovery smoke/tool roster.
- [ ] Reconcile package dependencies without duplicate runtime ownership.
- [ ] Run core and GUI tests.
- [ ] Run typecheck/build and all MCP smokes.
- [ ] Run manual/skills verification.
- [ ] Rebuild plugin from normal main checkout and pass plugin sync.
- [ ] Run a controlled local MCP start/list/cancel proof with no unreviewed remote endpoint.
- [ ] Run diff/status checks.

## Scope and stop

- [ ] Confirm no arbitrary command/args/prompt/cwd/env/log field exists.
- [ ] Confirm dispatch remains disabled by default and auth alone cannot enable it.
- [ ] Confirm no durable queue/retry/auto/raw-log/HTTP/auth/Connect/worktree scope entered the diff.
- [ ] Stop with the PR ready for independent security review; do not merge or start MCP-014.

## Progress notes

Append implementation notes here; never weaken the authorization boundary to pass a test.
