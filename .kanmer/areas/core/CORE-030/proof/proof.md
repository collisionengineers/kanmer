# Proof — CORE-030

PR [#73](https://github.com/collisionengineers/kanmer/pull/73) merged to `main` as `894092891956fe798eaa45b36d8c609000b75f33`.

Merged-main verification:

- `npm test -w @kanmer/core -- staleness.test.ts` — 40 passing tests.
- `npm run typecheck -w @kanmer/core` — passed.
- `git diff --check` — clean.

The merged detector limits copied-skill staleness to Kanmer-owned destinations and ignores handmade Claude mirrors.
