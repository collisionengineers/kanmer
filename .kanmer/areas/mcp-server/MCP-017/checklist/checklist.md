# Checklist — MCP-017

- [ ] Record the current resolution-ownership contract and its MCP-007 history.
- [ ] Extract one dependency-free pure own-checkout predicate.
- [ ] Wire the live plugin check to that predicate before other validation.
- [ ] Preserve refusal wording and exit behaviour.
- [ ] Add direct local-core acceptance coverage.
- [ ] Add direct external/main-resolution refusal coverage.
- [ ] Add prefix-collision and strict-containment coverage.
- [ ] Add Windows path/case and POSIX case coverage.
- [ ] Add no test framework or runner dependency.
- [ ] Run the focused test.
- [ ] Run `npm run test:scripts`.
- [ ] Run normal-checkout `npm run plugin:check`.
- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `git diff --check`.
- [ ] Write the implementation report, PR, review, merged-main proof, and closeout evidence.
