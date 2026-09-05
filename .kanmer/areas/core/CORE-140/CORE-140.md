---
id: CORE-140
type: ticket
title: >-
  Build each rail artifact once and refuse an already-built step whose stamp
  does not match
status: done
area: core
assignee: claude-code
profile: fix
stageEntered:
  preparing: '2026-09-05T02:17:42.836Z'
  review: '2026-09-05T02:41:24.782Z'
  verifying: '2026-09-05T03:41:13.180Z'
  done: '2026-09-05T03:52:38.349Z'
taken_at: '2026-09-05T02:18:41.901Z'
branch: CORE-140-rail-build-once
worktree: .worktrees/CORE-140
claim_expires_at: '2026-09-05T02:48:41.901Z'
claim_controller: claude-code
lease_id: bb30fcb6-f9f0-4eeb-ab4f-7934e86f7c15
lease_revision: 1
lease_workspace: 'worktree:c:\users\alex\documents\github\kanmer\.worktrees\core-140'
lease_phase: implementing
lease_heartbeat_at: '2026-09-05T02:18:41.901Z'
labels:
  - rail
  - build
  - 0.4.2
groups:
  - HZN-009
links:
  - CORE-139
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/322'
delivery_state: integrated
delivery_branch: main
delivery_sha: 941650317be4cad4f6a86c6ab16362ee5dd8dfdb
delivery_recorded_at: '2026-09-05T03:52:42.259Z'
archived: false
created: '2026-09-05T02:12:03.055Z'
updated: '2026-09-05T03:52:42.259Z'
---

## Problem

One run of the canonical rail (`npm run verify`) compiles core and the MCP server three times. `scripts/verify.mjs` runs `npm run build` first; then `npm test` reaches `test:http` in `packages/mcp-server/package.json`, which is `npm run build && node --test …`; then `mcpb:check` runs `mcpb:build`, which is `npm run build && node scripts/build-mcpb.mjs`. Sharing one command array did not remove the nested rebuilds. Every PR, every push to `main` and every release pays for the same output three times on a Windows runner, and the local rail does the same.

The GUI build (`npm run build -w @kanmer/gui`) is a different artifact and is not a duplicate.

## Outcome

Within one canonical rail each required output is generated once and consumed by every later step. The public standalone commands (`npm run test:http -w @kanmer/mcp-server`, `npm run mcpb:check`) still build their own prerequisites on a fresh checkout. An "already-built" step refuses — never silently rebuilds — when the in-run stamp is absent or does not match the source, lockfile, Node major or the output hashes.

## Acceptance

- A static test resolves every `VERIFY_STEPS` entry through the package scripts and proves the root workspace build appears exactly once in the rail.
- `node scripts/build-stamp.mjs --assert …` fails on a missing stamp, a different HEAD, a changed dirty-tree digest, a changed `package-lock.json` hash, a different Node major, or a missing/mismatched output.
- A fresh `git clone` + `npm ci` still passes `npm run test:http -w @kanmer/mcp-server` and `npm run mcpb:check` without the stamp.
- `scripts/release.mjs` still runs the shared catalogue and additionally refuses to package from a `dirty: true` stamp.
- `pr.yml` runs on Node 24 with the same test selection and assertions; `release.yml` stays on Node 20 in this release (electron-builder under Node 24 is qualified in 0.5.0).
- Before/after rail wall time recorded in the proof as an observation, not a promise.

## Out of scope

Cross-run or cross-job build caches, artifact fan-out between CI jobs, test scheduling or sharding, framework migrations, any change to which assertions run.

## Technical seam

`scripts/verify.mjs` `VERIFY_STEPS` stays the single catalogue (imported by `scripts/release.mjs`). New `scripts/build-stamp.mjs` (`writeStamp`, `readStamp`, `assertBuilt`; stamp at gitignored `dist/verify-stamp.json`). New `packages/mcp-server/scripts/run-http-tests.mjs` owning the one `node --test` file list with `--assume-built`; new `scripts/run-tests.mjs` owning the `npm test` chain with `--assume-built`. Internal `test:built`, `test:http:built`, `mcpb:build:built`, `mcpb:check:built` scripts used only by the rail after `build-stamp --write`. New `scripts/verify-steps.test.mjs` picked up by `scripts/test-scripts.mjs`. Existing pins: `scripts/pr-workflow.test.mjs`, `packages/core/scripts/check-browser.mjs`.
