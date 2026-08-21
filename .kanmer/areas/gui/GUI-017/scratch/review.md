# Independent review — GUI-017

Reviewed on merged `main` at `d473b6fa542d28439e69e9939d7721467cddd800` after the author handoff.

## Scope and traceability

- Historical implementation is PR [#25](https://github.com/collisionengineers/kanmer/pull/25), implementation `6e21ac2ba1ec52292af47d99f2c9020ed7712817`, merge `39080d7f2d4deed02671f85674c4ae2c2179d4a0`.
- Current main contains the implementation and the later DOC-007 manual reconciliation; no new source diff or PR was required.
- The reviewed packet is GUI-017 only. No GUI-016, provider, or unrelated scope is included.

## Checks

- `npm run check:manual` — PASS, committed generated manual is up to date (22 chapters).
- `npm run test -w @kanmer/gui -- --run src/renderer/src/manual/manual.test.ts` — PASS, 11/11.
- `npm run typecheck` — PASS for core, mcp-server, ui, and gui.
- `git diff --check` — PASS.
- The handoff's full GUI rail (352/352), `verify:docs`, GUI build, and static no-network scan were read and are consistent with the current implementation.
- The first full root `npm test` attempt in the handoff failed because a fresh worktree lacked `packages/core/dist/index.js`; the targeted repair pass passed. This failure is preserved, not waived.

## Findings and dispositions

1. The existing proof document is stale: it says 12 chapters, references the pre-reconciliation `VIEW_LABELS` implementation, and claims boot exit 0 while the report records an Electron-install failure. **Disposition: fix in Verifying by replacing proof with merged-main evidence.**
2. Interactive F1/search/theme/screenshot and Electron boot evidence are unavailable in this environment. **Disposition: accept as explicitly INCONCLUSIVE in report/proof; do not claim PASS.**
3. The shortcut test intentionally proves table↔generated chapter parity, not that the imperative handler cannot drift. **Disposition: accepted risk, documented in source/report.**

No blocking correctness finding remains for the deterministic/bundled implementation. Ready to move to Verifying; proof must be rewritten there on merged main.
