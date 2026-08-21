# MCP-037 checklist

## Preparation

- [x] Read MCP-037, HZN-007 context, MCP-036 packet, and governing FRD/ADR.
- [x] Record the exact reviewer reproduction and bounded scope.
- [x] Map the startup and regression-test files.
- [x] Resolve all preparation questions.

## Implementation

- [x] Move fingerprint resolution inside startup rollback handling.
- [x] Ensure failed pre-bind startup destroys the sweep timer and remains safely closeable.
- [x] Add a regression for no-board failure with no listener and destroyed timer.
- [x] Run focused HTTP tests.
- [x] Run build and protocol/discovery/stdio smoke checks.
- [x] Run root typecheck, plugin check, npm test, and diff check on merged main.
- [x] Write post-implementation report.

## Review

- [x] Independent reviewer records PASS.
- [x] No residual findings remain.
- [x] PR #109 merged through PR #107 at main commit 4d65d91.

## Verification and closeout

- [x] Verify the merged commit on main.
- [x] Write proof on merged main.
- [x] Move through Done and release the ticket.
- [x] Remove the worktree and branch after the merged commit is reachable.
