# Post-implementation report — CORE-056

## Outcome

CORE-056 is Review-ready as a bounded remediation stacked on the exact CORE-044 cumulative head 142af2f3b105b38b00d659019d1cfe99f3b50844. The implementation branch is core-056-source-refresh, worktree .worktrees/core-056, commit 69860063c583eaecb1cee9c679ded4abb6eb96dd. Ticket-linked PR #179 targets core-044-source-fetch-remediation so the three CORE-044 source-refresh findings remain reviewable as a stack.

No merge, self-review, Verifying/Done move, or cleanup was performed. The next action is independent review of PR #179 against CORE-044, followed by the normal merge/verify gates owned by another agent.

## Scope and implementation

The source diff is limited to the three recorded CORE-044 findings:

1. fetchLlmsTxt now holds the existing per-source exclusive cache lock across cache read, freshness decision, root fetch, linked revalidation, and atomic replacement write. The lower-level cache writer is intentionally unlocked to avoid recursive lock acquisition. This serializes refresh transactions without adding authority or changing the source URL/page/time/byte bounds.
2. Root-304 linked revalidation charges retained cached document UTF-8 bytes before appending them. A retained page that would exceed the 2 MiB aggregate budget is omitted and reported, keeping returned/cache documents bounded.
3. Root-304 revalidation reconstructs bounded same-origin direct Markdown candidates from the cached root/final URL. Cached candidates use validators; candidates absent from the previous cache are fetched without validators, so a newly added or previously missing linked page is retried.

Three deterministic source regressions cover concurrent refresh serialization, retained 304-byte accounting, and missing-link retry. Existing assertions were preserved. The shipped standalone plugin artifact was regenerated and synchronized.

## Governing-doc mapping

- FRD-027 defines project-declared source preference, HTTPS/same-origin bounded fetches, validator-aware cache behavior, direct-link/page/byte/time limits, and derived cache semantics; this change preserves those boundaries while making refresh consistency explicit.
- ADR-0020 keeps fetched documents/cache derived and non-authoritative; locking and missing-link retry do not install, enable, trust, or crawl outside the existing bounded candidate set.
- CORE-044/PR #165 is the exact parent remediation base. DNS rebinding/lookup timeout, board-worktree cache ignore, plugin-path provenance, and crash-at-write proof remain separate linked follow-ups or explicit evidence limits; they are not absorbed here.

## Verification ledger

All commands below were run in .worktrees/core-056 unless noted.

- Initial npm run build:server before installing worktree-local dependencies exited 1 because the shared/root @kanmer/core resolution lacked the current exports; the immediate source import rail also exited 1. This first setup failure is preserved, not reclassified. After npm install --ignore-scripts --no-package-lock in the ticket worktree, the exact branch-local build succeeded.
- npm run build:core: exit 0.
- npm run build:server: exit 0 after the local dependency correction.
- node --test packages/mcp-server/src/sources.test.mjs: exit 0, 17/17.
- npm run test -w @kanmer/core -- src/io.test.ts src/sources.test.ts src/store.test.ts: exit 0, 116/116.
- Full core rail during the first workspace run: exit 0, 303/303; full GUI rail: exit 0, 382/382.
- First broad npm test attempt exited 1 because the new concurrency test assumed Promise result order and because the inherited tunnel-readiness test timed out. The regression was corrected to assert one cached result without assuming lock-acquisition order. The complete npm run test:http -w @kanmer/mcp-server rerun then exited 0, 85/85, including all 17 source tests and the readiness suite.
- npm run test:scripts: exit 0, 88/88.
- npm run typecheck: exit 0 for all workspaces; focused core and MCP server typechecks also exited 0.
- npm run check:manual during the workspace rail: exit 0, manual up to date.
- npm run plugin:build: exit 0; npm run plugin:check: exit 0, 37 tools and bundle bytes match.
- git diff --check: exit 0.

The initial broad-run failures remain part of the ledger; the later corrected focused/full HTTP pass does not erase them. No hosted CI or live external llms.txt/DNS/packaged-update evidence is claimed here. Verification on merged main belongs to the independent verify stage.

## Traceability and handoff

- Base: CORE-044 cumulative head 142af2f3b105b38b00d659019d1cfe99f3b50844.
- Implementation: 69860063c583eaecb1cee9c679ded4abb6eb96dd.
- PR: #179, core-056-source-refresh -> core-044-source-fetch-remediation.
- Status: Review; independent review required. No merge, verification, or cleanup by the author.
