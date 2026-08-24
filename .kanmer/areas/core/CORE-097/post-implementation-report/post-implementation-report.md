# Post-implementation report — CORE-097

## Outcome

PR [#245](https://github.com/collisionengineers/kanmer/pull/245) is open from `core-097-nonpublishing-release-verify` at `a029e5e5deddb197f703c3fede4ab1b2b49a9bbc`.

## Delivered

- Replaced only the tag workflow's packaged-updater command with the same build/check sequence expressed explicitly, passing `--publish never` to Electron Builder.
- Preserved `permissions: contents: read`, the later asset-verifier token mapping, tag trigger, retry policy, GUI publisher configuration, and local `scripts/release.mjs` ownership.
- Added static release-workflow coverage that locks the read-only permission, the explicit non-publishing invocation, and absence of a package-step `GH_TOKEN`.
- Updated `AGENTS.md` to document the changed CI command sequence and retained non-publishing release boundary.

## Security and release boundary

No credential, repository secret, write permission, tag, release, asset upload, repair, or GUI packaging configuration was added or changed. The historical v0.3.4 tag failure was not replayed or rewritten.

## Validation

- Focused regression: `node --test scripts/release-flow.test.mjs` — PASS (6/6 after one assertion-indentation correction).
- Script suite: `npm run test:scripts` — first attempt was blocked by the missing pre-build core artifact; after `npm run build`, PASS (99/99).
- Non-publishing packaged output: the default ignored output directory returned Windows `EBUSY` before a publish attempt. The documented alternate output command `electron-builder --win --publish never --config.directories.output=release-core097` succeeded; `node scripts/check-updater-package.mjs --out apps/gui/release-core097` passed all 8 checks.
- Authoritative fresh GitHub-origin normal clone at the PR head: `npm run verify` — PASS. Core 310/310, GUI 468/468, MCP HTTP 102/102, script tests 99/99, all-workspace typecheck, documentation, MCP smokes, managed-block/skill verification, and plugin synchronization all completed.

## Handoff

Await independent PR review and merge. Do not retag, publish, or verify/close this ticket from this branch.
