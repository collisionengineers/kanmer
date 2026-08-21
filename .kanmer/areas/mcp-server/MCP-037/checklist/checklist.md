# MCP-037 checklist

## Preparation

- [x] Read MCP-037, HZN-007 context, MCP-036 packet, and governing FRD/ADR.
- [x] Record the exact reviewer reproduction and bounded scope.
- [x] Map the startup and regression-test files.
- [x] Resolve all preparation questions.

## Implementation

- [ ] Move fingerprint resolution inside startup rollback handling.
- [ ] Ensure failed pre-bind startup destroys the sweep timer and remains safely closeable.
- [ ] Add a regression for no-board failure with no listener and destroyed timer.
- [ ] Run focused HTTP tests.
- [ ] Run build and protocol/discovery/stdio smoke checks.
- [ ] Run root typecheck and diff check.
- [ ] Write post-implementation report.

## Review

- [ ] Independent reviewer records PASS or findings.
- [ ] Any findings are fixed, rejected with reason, accepted as risk, or deferred to a linked ticket.
- [ ] PR is merged into the MCP-025 transport branch.

## Verification and closeout

- [ ] Verify the merged commit on main.
- [ ] Write proof on merged main.
- [ ] Move through Done and release the ticket.
- [ ] Remove the worktree and branch after the merged commit is reachable.
