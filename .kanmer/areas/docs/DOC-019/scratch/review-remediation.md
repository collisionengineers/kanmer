## Independent review remediation

Addressed findings on PR #227 old head:

- Canonical `kanmer-docs` asset is now target-neutral for `repoDocs` globs; this board's generated mirror retains its resolved `docs/product/prd/**`, `docs/functional/frd/**`, and `docs/architecture/adr/**` paths.
- Removed the claim that the document-type set is board-configurable; Format 3's seven folder types are fixed and profiles select requirements.
- Added `npm run verify:docs` to AGENTS.md's command table/checklist and described the shared verify rail.
- Narrowed FRD-019 R6 keyboard evidence to the tested behavior and recorded the ArrowLeft submenu limitation. GUI-126 tracks parent-focus restoration because GUI source changes are outside DOC-019.
- Added README and AGENTS guidance to retain/provide local release artifacts with `--dir`; missing local artifacts are not a remote-release verdict.

The canonical/mirror validator and tests were updated for target-neutral source plus resolved mirror rather than byte equality. Ticket remains Review; no merge.
