# Post-implementation report — CORE-058

*Author report before merge; proof belongs to merged-main verification.*

## Summary

CORE-058 closes the CORE-044 board-cache and plugin-provenance findings. Canonical board worktrees now receive the exact `.kanmer/data/sources/` ignore rule when created, reopened, or reconciled from a branch mismatch, and board synchronization is tested against a derived cache file. The committed standalone plugin bundle was regenerated from a separate normal checkout and refreshed again after synchronizing the latest CORE-044 base.

## Changes

| File | Change | Why |
|---|---|---|
| `apps/gui/src/main/kanmerGit.ts` | Added one canonical board-worktree ignore list and reconciled it on attached, branch-mismatch, and orphan-create paths. | Prevent derived source cache, activity, and atomic temp residue from entering board Git state while preserving branch/ref/path behavior. |
| `apps/gui/src/main/kanmerGit.test.ts` | Added real-Git tests for new-worktree creation, existing-worktree reconciliation, mismatch reconciliation, and sync staging safety. | Prove the rule is present exactly once and derived cache remains ignored. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Replaced generated bundle with output from normal checkouts of the exact branch, including the latest CORE-044 cumulative base. | Make committed plugin bytes reproducible and satisfy the checkout-owned dependency guard. |

No dependency, provider, source-fetch, or unrelated GUI behavior was changed. The branch was synchronized with the advanced CORE-044 base in merge commit `3218bc79`; the generated artifact was then refreshed in `d50ddab17c33fcdc645f9c777a635cc2d72f26ee`.

## Governing docs

- FRD-027 defines source declarations and their bounded derived cache; the cache remains local derived state and is not made a source authority.
- ADR-0020 requires fail-closed, provider-neutral source boundaries; this ticket changes only board Git hygiene and generated artifact provenance.
- CORE-044 PR #165 cumulative base after the synchronization is `142af2f3b105b38b00d659019d1cfe99f3b50844`; CORE-056 source changes were inherited only through the required base update and were not authored by this ticket.

## Verification ledger

Pre-synchronization deterministic evidence:

- Focused GUI Git: exit 0, 15/15.
- Full GUI: exit 0, 385/385.
- Workspace typecheck: exit 0; GUI build: exit 0.
- Scripts: exit 0, 88/88; protocol smoke: exit 0, 46/46; verify:docs: exit 0; diff-check: exit 0.
- Normal-checkout build: `npm ci --ignore-scripts --no-audit --no-fund`, build:core, build:server, build-plugin, and plugin:check all exit 0. Fresh/committed artifact SHA-256 before base sync: `481DF490693811BA2CB488422FB286ECB79B01A503C289488DFAD3DF5E373D87`.

Post-synchronization evidence on PR head `d50ddab17c33fcdc645f9c777a635cc2d72f26ee`:

- `npm run build:core`: exit 0.
- `npm run build:server`: exit 0.
- `node --test packages/mcp-server/src/sources.test.mjs`: exit 0, 17/17 (including inherited CORE-056 source tests).
- `npm run typecheck`: exit 0 across all workspaces.
- Focused GUI Git: exit 0, 15/15.
- Normal-checkout merged-base artifact proof: build:core, build:server, build-plugin, and plugin:check all exit 0; fresh/committed artifact SHA-256 `6057648D81FB4CCCAB629A0EE1C05C8716A564400302238857E785C70C485100`; isolated handshake lists 37 tools.
- `gh pr view 180`: OPEN, MERGEABLE, base `core-044-source-fetch-remediation`, head `d50ddab17c33fcdc645f9c777a635cc2d72f26ee`; no hosted checks attached at handoff.

The first linked-worktree `npm run build:server` attempt exited 1 because stale shared core dist lacked cumulative source exports. That failure is preserved in scratch; corrected local and normal-checkout builds pass. The initial PR conflict was a generated-plugin-only conflict; it was resolved by the explicit base merge and normal-checkout regeneration above.

## Risks / follow-ups

Existing cache files already committed in board history are not rewritten; this ticket protects future creation/reconciliation/sync only. Retroactive history cleanup, installed-host interaction, release-packaged plugin execution, and live provider evidence are INCONCLUSIVE/deferred.

## Verification hand-off

On merged `main`, rerun focused/full GUI Git rails, workspace typecheck/build, source/HTTP rails for the cumulative base, and normal-checkout plugin build/check. Verify the board worktree `.gitignore` contains `.kanmer/data/sources/` exactly once and a cache file remains untracked during sync. Preserve live packaged/host evidence as INCONCLUSIVE unless exercised on an actual controlled host.
