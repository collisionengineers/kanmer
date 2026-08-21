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

- 2026-08-21 verification: focused guard test 5/5; `npm run test:scripts` 71/71; `npm run build` passed; linked-worktree `npm run plugin:check` refused with exit 1 as designed.
- First exact `npm test` retained a pre-existing core migration timeout (254/255; Vitest 5s timeout); after build, the exact command passed with core 255/255, GUI 318/318, HTTP 3/3, scripts 71/71.
- First `npm run typecheck` failed before build because the fresh worktree lacked generated core declarations; after build, all workspaces typechecked successfully. `git diff --check` passed.
