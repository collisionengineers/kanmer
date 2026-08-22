# CORE-083 checklist

- [ ] Confirm exact CORE-026 base `a9833df28ddf6f91966be17a4eb7c06265e088ed` and isolated worktree/branch.
- [ ] Read the complete ticket/group packet and governing docs; preserve CORE-082 behavior.
- [ ] Record source `.kanmer` fingerprint in orphan marker and verify it immediately before cleanup.
- [ ] Fail closed on mismatch/malformed marker and preserve source + canonical board state.
- [ ] Retain canonical boardRoot when source-root ignore reconciliation refuses.
- [ ] Add deterministic/real-Git source-version conflict regression.
- [ ] Add deterministic/real-Git source-ignore refusal regression.
- [ ] Run focused tests, relevant workspace rails, and diff-check; preserve first failures and INCONCLUSIVE boundaries.
- [ ] Write post-implementation report with exact commit/PR and exit codes.
- [ ] Open ticket-linked PR and hand off at Review; leave post-merge proof unchecked.
