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
- [x] Run root typecheck and diff check.
- [x] Write post-implementation report.

## Review

- [x] Independent reviewer records PASS or findings.
- [x] Any findings are fixed, rejected with reason, accepted as risk, or deferred to a linked ticket; MCP-037 had no residual findings.
- [x] PR #109 is merged into the MCP-025 transport branch at d189cbc46bc440ee3d24b7045306bdfbe84997a7.

## Verification and closeout

- [ ] Verify the merged commit on main.
- [ ] Write proof on merged main.
- [ ] Move through Done and release the ticket.
- [ ] Remove the worktree and branch after the merged commit is reachable.
