Reconciled historical implementation on merged main; no source diff on fresh branch. Preserved initial release:notes exit 1 due unbuilt core dist; build:core exit 0; subsequent release notes both roots exit 0; verify:agents-block 31/31, scripts 79/79, typecheck and diff-check exit 0. Existing PR #26 is the implementation PR; no duplicate PR created.

Scoped fix added: release-notes normalizes numeric/#number PR refs to origin /pull/<number> URLs and regression test covers real output. Patched test:scripts 80/80, agents block 31/31, typecheck, release notes and diff-check pass; initial missing core dist exit 1 retained.

Opened PR #138 (https://github.com/collisionengineers/kanmer/pull/138) for the scoped shorthand-PR-link correction. Source commit 75dc1ad9; historical implementation PR #26 retained in traceability. Await independent review; no merge or cleanup.
