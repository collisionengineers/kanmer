# Checklist — MCP-017

- [x] Record the current resolution-ownership contract and its MCP-007 history.
- [x] Extract one dependency-free pure own-checkout predicate.
- [x] Wire the live plugin check to that predicate before other validation.
- [x] Preserve refusal wording and exit behaviour.
- [x] Add direct local-core acceptance coverage.
- [x] Add direct external/main-resolution refusal coverage.
- [x] Add prefix-collision and strict-containment coverage.
- [x] Add Windows path/case and POSIX case coverage.
- [x] Add no test framework or runner dependency.
- [x] Run the focused test.
- [x] Run `npm run test:scripts`.
- [x] Run normal-checkout `npm run plugin:check` after merge (linked-worktree invocation correctly refused).
- [x] Run `npm test` component rails.
- [x] Run `npm run typecheck`.
- [x] Run `git diff --check`.
- [ ] Write the implementation report, PR, review, merged-main proof, and closeout evidence.

## Progress notes

- 2026-08-21: `dd9f736` extracts the current ownership predicate. The check's linked-worktree refusal is intentionally preserved; its normal-checkout success is reserved for post-merge verification because `plugin:check` is designed to refuse in this ticket worktree.
- Evidence: focused guard test 5/5; `npm run test:scripts` 71/71; core 255 tests; GUI and MCP HTTP rails passed; `npm run typecheck` and `git diff --check` passed.
