# Post-implementation report

## Summary

CORE-079 fixes the hosted Windows portability failure from CORE-026 by comparing the three expected board-root paths through the existing pathIdentity helper. This is test-only; no production behavior or path contract changed.

## Changed files

- apps/gui/src/main/kanmerGit.test.ts
  - The orphan cleanup retry fixture and first-time local/remote attachment fixtures now canonicalize their expected board root with pathIdentity(resolve(...)).
  - This preserves filesystem identity while accepting Windows 8.3 and long-path spellings.

## Governing-document alignment

The change supports FRD-027 and ADR-0020 board-worktree/source synchronization proof without changing source trust, cache, locking, or runtime behavior. It directly remediates CORE-026 review finding F-022 and leaves the existing production path contract intact.

## Verification evidence

All final checks ran from .worktrees/core-079 after installing worktree-local dependencies and building the branch-local core artifact:

- Focused npm run test -w @kanmer/gui -- src/main/kanmerGit.test.ts: exit 0, 27/27.
- Full npm run test -w @kanmer/gui: exit 0, 45 files, 404/404.
- npm run test -w @kanmer/core: exit 0, 303/303.
- npm run build: exit 0, core and MCP server/standalone builds.
- npm run typecheck -w @kanmer/gui: exit 0.
- npm run build -w @kanmer/gui: exit 0.
- npm run test:scripts: exit 0, 88/88.
- npm run verify:docs: exit 0.
- npm run check:manual: exit 0.
- git diff --check: exit 0.

## Preserved failed attempts and boundaries

- First scripts run exited 1 because the fresh worktree had no packages/core/dist; after npm run build:core, the rerun passed 88/88.
- First full GUI run exited 1 with four unrelated shared-provider baseline failures while the repaired 27 Git tests all passed: three suites could not resolve antigravity, and one dispatch expectation received the provider capability error first.
- First GUI typecheck/build exited 1 while the worktree borrowed the main checkout stale @kanmer/core link. After npm install --ignore-scripts --no-audit --no-fund --prefer-offline and branch-local npm run build, both reran PASS.
- The final npm run verify wrapper exited 1 after core reported 303/303 because Vitest surfaced one unrelated transient ENOENT from dispatch-supervisor.test.ts while opening a temporary MCP-024 log. The independent core rerun was 303/303 PASS; this wrapper failure is retained, not reclassified.
- No live hosted run, packaged installer, visual GUI, provider, or external-network evidence is claimed by this test-only ticket.

## Handoff

The next verifier should rerun the focused and full GUI rails from merged main, then the authoritative npm run verify wrapper. No source or generated artifact changes are expected beyond this test file.

## Traceability

Commit fdecc533 is pushed on core-079-windows-path-identity. PR #200 targets core-026-project-declared-sources at https://github.com/collisionengineers/kanmer/pull/200. CORE-079 is now in Review; independent review/merge is assigned to gui082. No merge or cleanup was performed by the author.
