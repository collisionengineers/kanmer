## Independent review remediation

Addressed findings on PR #227 old head:

- Canonical `kanmer-docs` asset is now target-neutral for `repoDocs` globs; this board's generated mirror retains its resolved `docs/product/prd/**`, `docs/functional/frd/**`, and `docs/architecture/adr/**` paths.
- Removed the claim that the document-type set is board-configurable; Format 3's seven folder types are fixed and profiles select requirements.
- Added `npm run verify:docs` to AGENTS.md's command table/checklist and described the shared verify rail.
- Narrowed FRD-019 R6 keyboard evidence to the tested behavior and recorded the ArrowLeft submenu limitation. GUI-126 tracks parent-focus restoration because GUI source changes are outside DOC-019.
- Added README and AGENTS guidance to retain/provide local release artifacts with `--dir`; missing local artifacts are not a remote-release verdict.

The canonical/mirror validator and tests were updated for target-neutral source plus resolved mirror rather than byte equality. Ticket remains Review; no merge.

## Second-pass review remediation

- Freshness now discovers the available board worktree or honors KANMER_BOARD_ROOT/KANMER_ROOT, and compares resolved repoDocs values without checker-owned path constants. With no board checkout it validates mirror rows generically; a test injects a custom map and proves stale config fails.
- README and AGENTS now document verify-release-assets' contract: installer/blockmap local artifacts are required; matching latest.yml is byte-compared, while absent/different-version manifests are presence/state-only.
- Canonical source footer retains Kanmer maintainer instructions; generated mirror footer is consumer-safe and tells target maintainers to rerun setup/their documentation rail without source-only paths or commands.
- README and AGENTS clarify dry-run skips Git/remote publication but verification may write local dist/release/mcpb artifacts.

Focused mirror tests now pass 3/3 and verify:docs passes. Ticket remains Review.
