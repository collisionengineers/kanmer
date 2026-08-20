# Proof — GUI-087

PR [#75](https://github.com/collisionengineers/kanmer/pull/75) merged to `main` as `d5fe98b70c36cfda98650b2b2572239b53d67768`.

Merged-main verification: `npm test -w @kanmer/gui -- gateError.test.ts` (4 passed), `npm run typecheck -w @kanmer/gui` passed, `npm run check:manual` reports current generated chapters, and `git diff --check` is clean.

The GUI now translates current core gate failures into Ticket-tab/readiness-panel language without exposing MCP tool names.
