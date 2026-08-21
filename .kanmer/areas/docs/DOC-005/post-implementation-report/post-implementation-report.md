# Post-implementation report — DOC-005

## Scope and disposition

The original DOC-005 implementation is already on merged main from PR [#26](https://github.com/collisionengineers/kanmer/pull/26), source 1df633e7dd4b424ac0a7107ac08d2289c61260dd, merge 05a335dc0e9b4b75ef9904218c55ca643f9a519d. Fresh reconciliation found a real in-scope defect in its release-note stretch: board PR references may be numeric or #number strings, and the script emitted those as invalid relative Markdown links such as [PR](96).

This branch adds only the scoped correction and its regression test:

| Path | Change | Rationale |
|---|---|---|
| scripts/release-notes.mjs | Normalize numeric/#number PR refs through the origin remote URL; preserve full HTTP(S) refs and read-only behavior. | Every release-note PR entry is an actionable repository link. |
| scripts/release-notes.test.mjs | Execute the real script against the documented board and assert shorthand PR refs become full /pull/<number> links. | Prevents the malformed-link regression. |

The existing AGENTS.md, docs/README.md, package.json and release-notes implementation remain unchanged by this branch because they are already merged from PR #26. No unrelated files changed.

## Governing document

ADR-0010 says setup reconciles existing reality into Kanmer and is idempotent. The correction consumes the board's existing PR-reference shapes instead of rewriting historical tickets; it makes the release-note output reflect that reality without mutating the board.

## Verification evidence

- Initial release:notes invocation from the fresh worktree — exit 1 because packages/core/dist/index.js was not built. Preserved as the first failure.
- npm run build:core — exit 0.
- npm run release:notes -- --since v0.3.2 from ticket worktree before patch — exit 0; 93 tickets across 5 areas, but malformed shorthand links were observed.
- npm run release:notes -- --since v0.3.2 from normal main before patch — exit 0; same output shape.
- npm run verify:agents-block — exit 0, 31/31.
- npm run test:scripts — exit 0, 80/80, including release-notes.test.mjs.
- npm run release:notes -- --since v0.3.2 from patched ticket worktree — exit 0; numeric refs emit full repository /pull/<number> links and full URLs remain unchanged.
- npm run typecheck — exit 0 across core, mcp-server, ui and gui.
- git diff --check — exit 0.

The script writes only stdout; the ticket test invokes it as a child process and does not write board/source files.

## Verify handoff

On merged main, rerun verify:agents-block, npm run test:scripts, npm run typecheck and release:notes from a ticket worktree and normal checkout. Review the two-file diff against ADR-0010 and confirm no board mutation. The historical PR #26 remains the original implementation trail; this branch now has a real scoped correction suitable for an independent PR review.
