# Open questions — CORE-101

## Resolved

- [x] Is [[DOC-024]] a hard prerequisite before taking CORE-101 or running a release command? Yes. It is the typed blocker and must be Done after independent review, normal merge, and merged-main proof; a merely open PR or merged-but-unverified state is insufficient.
- [x] May CORE-101 retry, repair, retag, manually upload, edit a release, or bypass protection if either v0.3.7 phase fails? No. Preserve the exact failure and stop; any defect/remediation is separately ticketed and governed.
- [x] What remains immutable? v0.3.4 and v0.3.5 failed-publication records, and v0.3.6's public incomplete release/tag/assets/workflow evidence; CORE-101 must not alter or reclassify them.
- [x] How is canonical board binding supplied? Set only the process-scoped `KANMER_ROOT` environment variable to the existing canonical board root reported by `get_status.projectRoot`; do not copy, initialize, or edit a board in either clone.
- [x] What credential scope is allowed? Preparation uses the authenticated GitHub CLI session only. The publisher receives an authorized release credential only in its one process environment; no token appears in source, CI, command output, ticket documents, scratch, proof, or PR text.
- [x] Is completion established by a green publisher process alone? No. It additionally requires strict public asset and `latest.yml` verification to pass and the tag-triggered `release-verify` workflow to reach terminal success.

## Parked (explicitly deferred)

No parked questions.
