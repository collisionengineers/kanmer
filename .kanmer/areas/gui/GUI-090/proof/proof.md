# Proof — GUI-090

PR [#76](https://github.com/collisionengineers/kanmer/pull/76) merged to `main` as `a2fb9684947d0d3105255b3d300da4dd2726c7d1`.

Merged-main verification:

- `npm test -w @kanmer/core -- staleness.test.ts` — 40 passed.
- `npm test -w @kanmer/gui -- repoStaleness.test.ts` — 4 passed.
- `npm run build:core`, then `npm run typecheck -w @kanmer/gui` and `npm run build -w @kanmer/gui` — passed.
- `git diff --check` — clean.

The core build is intentionally prerequisite for GUI workspace artifact resolution.
