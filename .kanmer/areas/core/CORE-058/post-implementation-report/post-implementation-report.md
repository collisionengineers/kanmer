# Post-implementation report — CORE-058

*Author report before merge; proof belongs to merged-main verification.*

## Summary

CORE-058 closes the CORE-044 board-cache and plugin-provenance findings. Canonical board worktrees now receive the exact `.kanmer/data/sources/` ignore rule when created, reopened, or reconciled from a branch mismatch, and board synchronization is tested against a derived cache file. The committed standalone plugin bundle was regenerated from a separate normal checkout of this exact cumulative source branch and passes byte-level plugin synchronization.

## Changes

| File | Change | Why |
|---|---|---|
| `apps/gui/src/main/kanmerGit.ts` | Added one canonical board-worktree ignore list and reconciled it on attached, branch-mismatch, and orphan-create paths. | Prevent derived source cache, activity, and atomic temp residue from entering board Git state while preserving existing branch/ref/path behavior. |
| `apps/gui/src/main/kanmerGit.test.ts` | Added real-Git tests for new-worktree creation, existing-worktree reconciliation, branch-mismatch reconciliation, and sync staging safety. | Prove the rule is present exactly once and derived cache remains ignored. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Replaced generated bundle with the artifact built from a normal non-linked checkout of this exact branch. | Make committed plugin bytes reproducible and satisfy the checkout-owned dependency guard. |

No dependency, provider, source-fetch, or unrelated GUI behavior was changed.

## Governing docs

- FRD-027 defines source declarations and their bounded derived cache; the cache remains local derived state and is not made a source authority.
- ADR-0020 requires fail-closed, provider-neutral source boundaries; this ticket changes only board Git hygiene and generated artifact provenance.
- CORE-044 PR #165 cumulative head `142af2f3b105b38b00d659019d1cfe99f3b50844` is the exact implementation base. CORE-058 does not absorb CORE-056/057 source behavior.

## Verification ledger

- `npm run test -w @kanmer/gui -- --run src/main/kanmerGit.test.ts`: exit 0, 15/15.
- `npm run test -w @kanmer/gui`: exit 0, 385/385.
- `npm run typecheck`: exit 0 across core, MCP, UI, and GUI.
- `npm run build:core`: exit 0.
- `npm run build:server`: exit 0 after the ticket-local core build.
- `npm run build -w @kanmer/gui`: exit 0.
- `npm run test:scripts`: exit 0, 88/88.
- `npm run smoke:protocol`: exit 0, 46/46 checks and 37 tools.
- `npm run verify:docs`: exit 0.
- `npm run plugin:check`: exit 0 after local workspace install; 37 tools, byte parity, isolated 37-tool handshake, 12 skill frontmatters, and manifests pass.
- Normal-checkout artifact proof: `npm ci --ignore-scripts --no-audit --no-fund`, `npm run build:core`, `npm run build:server`, `node scripts/build-plugin.mjs`, and `npm run plugin:check` all exit 0. Fresh and committed artifact SHA-256: `481DF490693811BA2CB488422FB286ECB79B01A503C289488DFAD3DF5E373D87`.
- `git diff --check`: exit 0.

The first linked-worktree `npm run build:server` attempt exited 1 because stale shared core dist lacked the cumulative source exports. That failure is retained in scratch; the corrected ticket-local build passed after core rebuild/local dependency installation.

## Risks / follow-ups

Existing cache files already committed in board history are not rewritten; this ticket protects future creation/reconciliation/sync only. Retroactive history cleanup, installed-host interaction, release-packaged plugin execution, and live provider evidence are INCONCLUSIVE/deferred.

## Verification hand-off

On merged `main`, rerun the focused/full GUI Git rails, workspace typecheck/build, `test:scripts`, protocol smoke, and normal-checkout `plugin:build`/`plugin:check`. Verify the board worktree's `.gitignore` contains `.kanmer/data/sources/` exactly once and that a cache file remains untracked during sync. Preserve live packaged/host evidence as INCONCLUSIVE unless exercised on an actual controlled host.
