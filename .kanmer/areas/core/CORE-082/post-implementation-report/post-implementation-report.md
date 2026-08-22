# CORE-082 post-implementation report

## Result and lineage

Implemented only the three CORE-026 review remediations in this ticket, stacked on cumulative base `a1a4fe629d71d149b64fd3e57979a` (`origin/core-026-project-declared-sources`). The final implementation commit and stacked PR are recorded on the ticket after commit/push.

- PID-reuse safety: lock records and owner leases persist an OS process-start identity. Linux uses the monotonic `/proc/<pid>/stat` start tick; supported Windows uses PowerShell's kernel process creation time without adding a dependency. A mismatched identity is reclaimable only after the existing inode/revalidation/atomic quarantine checks. An active owner or unavailable identity remains fail-closed.
- Malformed stale locks: empty/partial records may be quarantined after the stale interval only when no active owner marker exists; malformed token/identity/createdAt metadata remains unrecoverable and fail-closed. Existing quarantine, retry, marker cleanup, replacement-race, and surfaced-error paths remain intact.
- Board Git isolation: `.kanmer/**/*.lock`, lock owner-marker, and lock stale/quarantine patterns are appended to the existing board-worktree ignore set. Ordinary board files and derived source-cache exclusions remain unchanged.

## Changed files

- `packages/core/src/io.ts` and `packages/core/src/io.test.ts`
- `apps/gui/src/main/kanmerGit.ts` and `apps/gui/src/main/kanmerGit.test.ts`
- Regenerated `plugins/kanmer/mcp/kanmer-mcp.cjs`; SHA-256: `f162567c9ae7e329cf7aafbd3f752bda4fbe0f3cac32d5ae27f7e90871bffa5b`

## Verification (exact commands and exit codes)

- `npm test -w @kanmer/core -- --run src/io.test.ts`: first exit 1 because the pre-existing third-claimant test exceeded 5s after uncached Windows identity lookups; fixed by caching this process's identity, rerun exit 0, 29/29.
- `npm test -w @kanmer/core`: exit 0, 15 files / 307 tests.
- `npm test -w @kanmer/gui -- --run src/main/kanmerGit.test.ts`: exit 0, 28/28 (including the new lock-artifact test).
- Targeted `npm test -w @kanmer/gui -- --run src/main/kanmerGit.test.ts -t "keeps board lock ownership and quarantine artifacts out of sync"`: exit 0, 1 passed / 27 skipped.
- `npm run typecheck`: exit 0 across core, mcp-server, ui, and gui.
- `npm run build -w @kanmer/core`: exit 0.
- `npm run build -w @kanmer/gui`: exit 0.
- `npm run plugin:build`: exit 0.
- Initial `npm run plugin:check`: exit 1 because the linked worktree resolved `@kanmer/core` to the main checkout; after isolated `npm install --ignore-scripts --no-audit --no-fund`, rerun exit 0 (37 tools, bundle bytes match, handshake 37).
- `npm run test:scripts`: exit 0, 88/88.
- `git diff --check`: exit 0.
- A separate coordinator-started GUI full-rail attempt was interrupted after >2.5 minutes without output: INCONCLUSIVE for that attempt; the completed 28/28 run above is the authoritative local result.

## Scope and evidence limits

No live packaged Windows process-restart/PID-reuse test, multi-machine filesystem test, parent CORE-026 merge, or post-merge proof was performed. Those remain INCONCLUSIVE and are not claimed by this ticket. No source-fetch, GUI provider, migration, or unrelated sync behavior was changed.
