# Checklist — MCP-020

## Shared provider contract

- [x] Add core dispatch-provider id/type/records and immutable lookup/list helpers.
- [x] Preserve exact Codex, Claude, OpenCode and Grok CLI/args.
- [x] Keep Antigravity unavailable until MCP-015.
- [x] Exclude all Connect config/install metadata from the shared registry.
- [x] Make GUI dispatchability consume the shared registry.
- [x] Prove GUI and core dispatch provider rosters are identical.
- [x] Prove every existing Connect/provider fixture remains unchanged.

## Shared supervisor

- [x] Add an Electron-free injectable `DispatchSupervisor`.
- [x] Define shared lifecycle/status fields and sanitized/local views.
- [x] Use random UUID-based dispatch ids.
- [x] Enforce project+ticket duplicate lock atomically.
- [x] Enforce bounded max active atomically.
- [x] Create log only after all caller validation/approval.
- [x] Spawn fixed shared provider CLI/args at source root.
- [x] Own `cross-spawn` once if required for Windows CLIs.
- [x] Capture bounded stdout/stderr locally.
- [x] Handle synchronous spawn failure without stale lock/log.
- [x] Handle child error/close exactly once.
- [x] Implement bounded timeout and state reason.
- [x] Implement safe descendant cancellation with `execFile`/process groups.
- [x] Remove all locks/timers on every terminal path.
- [x] Retain bounded recent terminal metadata and deterministic eviction.
- [x] Record one bounded terminal ticket summary with requester/provider/task/result.
- [x] Surface `recordingError` rather than swallowing a failed audit write.
- [x] Add exhaustive fake-child transition/race/concurrency/timeout/cancel/eviction tests.

## GUI adapter

- [x] Replace GUI-local state machine/maps/tree-kill with the shared supervisor.
- [x] Supply Electron user-data log directory.
- [x] Preserve local renderer tail/status subscription.
- [x] Preserve source-root requirement and no worktree creation.
- [x] Preserve dispatch/list/cancel/kill-all IPC contracts.
- [x] Wire terminal scratch recorder and expose record failure.
- [x] Run existing GUI dispatch/provider tests green.

## Fail-closed MCP policy

- [x] Add pure policy parser with one documented configuration namespace.
- [x] Default disabled with empty allowlists.
- [x] Refuse malformed enablement rather than broaden it.
- [x] Validate configured provider ids against shared registry.
- [x] Validate configured task ids against core task SSOT.
- [x] Parse bounded max active and default/max timeout.
- [x] Parse only `elicit` or `preapproved` approval.
- [x] Keep invalid/missing approval disabled.
- [x] Expose sanitized policy block in `get_status`.
- [x] Add default/invalid/allowlist/bounds tests.

## MCP supervisor integration

- [x] Instantiate one supervisor outside board/repo with user-scoped log storage.
- [x] Use shared provider/task/prompt/feasibility contracts.
- [x] Bind statuses to current project identity/fingerprint.
- [x] Attribute requester explicitly in async terminal recorder.
- [x] Kill active children on server shutdown/signals.
- [x] Return no command/env/log path/raw tail remotely.

## `dispatch_task`

- [x] Register exactly one start tool with ticket/provider/task/optional bounded timeout/expected-project fields.
- [x] Mark it mutating/non-idempotent with explicit authorization description.
- [x] Validate expected project before any side effect.
- [x] Refuse disabled/invalid policy.
- [x] Refuse provider/task outside registry or operator allowlist.
- [x] Require existing non-archived ticket.
- [x] Refuse taken, duplicate and max-active cases.
- [x] Apply core task feasibility and return exact reason/warning.
- [x] Resolve prompt only from core named task and validated ticket id.
- [x] Resolve cwd only from server source root.
- [x] In `elicit`, require capability and accepted confirmation; fail closed otherwise.
- [x] In `preapproved`, record that explicit policy authorized the run.
- [x] Start through supervisor with actor attribution.
- [x] Return only sanitized status/deliverable/warning.

## List and cancel tools

- [x] Register read-only `list_dispatches` with ticket/state/recent filters.
- [x] Return active plus bounded recent statuses for this project only.
- [x] Include policy-disabled context without leaking internals.
- [x] Register mutating `cancel_dispatch` with dispatch id, bounded reason and expected project.
- [x] Validate project/policy before cancel.
- [x] Refuse unknown/non-active/other-project ids.
- [x] Never accept/call a client-supplied pid.
- [x] Record cancelling actor/reason and return sanitized state.

## Documentation, tests and bundle

- [x] Amend FRD-010 shared GUI/MCP dispatch policy/status/cancel/non-goals.
- [x] Amend FRD-022 exact three tools/schemas/annotations/errors/status/tool count.
- [x] Update manual enablement/approval/allowlist/security guidance.
- [x] Add exactly three tool-reference rows and field semantics.
- [x] Extend MCP smoke for disabled, malformed, approval, allowlist, project, ticket, duplicate/max, feasibility, timeout, terminal list, cancel and recording failure.
- [x] Extend protocol smoke and assert no sensitive fields in responses.
- [x] Extend discovery smoke/tool roster.
- [x] Reconcile package dependencies without duplicate runtime ownership.
- [x] Run core and GUI tests.
- [x] Run typecheck/build and all MCP smokes.
- [x] Run manual/skills verification.
- [x] Rebuild plugin from normal main checkout and pass plugin sync.
- [x] Run a controlled local MCP start/list/cancel proof with no unreviewed remote endpoint — default-disabled start/list/cancel refusal is proven; authenticated provider start/observe/cancel remains INCONCLUSIVE because no disposable authorized host/credential is available.
- [x] Run diff/status checks.

## Scope and stop

- [x] Confirm no arbitrary command/args/prompt/cwd/env/log field exists.
- [x] Confirm dispatch remains disabled by default and auth alone cannot enable it.
- [x] Confirm no durable queue/retry/auto/raw-log/HTTP/auth/Connect/worktree scope entered the diff.
- [x] Independent security review/merge completed; merged-main verification is complete; no MCP-014 scope entered.

## Progress notes

Merged-main verification notes (2026-08-22):

- PR #137 merge 1b5ae0d4546d1b57be393b38f4813f9ecfb6e7d5 is reachable from verified main af61144ce743f74b2aba92fb0778588b0b9bedd0.
- npm test -w @kanmer/core -- --testTimeout=30000: PASS, 263/263; npm test -w @kanmer/gui: PASS, 352/352.
- npm run typecheck, npm run build, node packages/mcp-server/src/smoke.mjs (224/224), npm run smoke:protocol (46/46), npm run smoke:discovery (13/13), npm run check:manual, npm run verify:skills, npm run plugin:check, and git diff --check: PASS.
- Prior initial typecheck failure and GitHub Windows path-alias CI failure remain recorded in proof; neither was weakened or erased.
- Live authorized provider dispatch/start/observe/cancel remains INCONCLUSIVE; no provider success is claimed. Default-disabled refusal and policy/smoke coverage are the accepted deterministic evidence.
