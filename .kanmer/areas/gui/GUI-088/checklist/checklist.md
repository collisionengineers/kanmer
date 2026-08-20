# Checklist — GUI-088

- [x] Move `ensureAgentsBlock(projectRoot)` ahead of the marketplace/copy-skills branch in `installSkills`.
- [x] Preserve marketplace command order, first-failure stop, and exact failed-command reporting.
- [x] Include `AGENTS.md block ensured` in marketplace success output.
- [x] Add marketplace Connect regression coverage for managed-block creation and byte-identical second connection.
- [x] Add marketplace-disconnect regression coverage for retaining the block under the non-destructive R4 policy.
- [x] Run the focused Connect test suite.
- [x] Run GUI typecheck and the relevant managed-block script test.
- [ ] Record actual verification results in the post-implementation report.

## Progress notes

- Implemented the universal block write before the install-kind branch. Marketplace outcomes now name it; their command ordering and first-failure behavior are unchanged.
- Regression coverage verifies creation, byte-identical reconnect, and non-destructive marketplace disconnect.
- Passed `npm test -w @kanmer/gui -- connect.test.ts` (22 tests), `npm run typecheck -w @kanmer/gui`, and `npm run verify:agents-block` (28/28 checks).
