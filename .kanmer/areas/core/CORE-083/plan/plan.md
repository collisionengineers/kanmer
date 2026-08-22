# CORE-083 plan

## Base and bounded outcome

Implement only the two CORE-026 review remediations on cumulative base `a9833df28ddf6f91966be17a4eb7c06265e088ed` (CORE-026 feature branch after CORE-082):

1. Before orphan source cleanup, record a deterministic fingerprint of the copied source `.kanmer` tree and compare the live source tree immediately before `git rm`. Any mismatch, malformed marker, or missing source version fails closed, leaves both source and canonical board state, and returns paused/error.
2. If source-root `.gitignore` reconciliation refuses (including a symlink), retain the established canonical boardRoot in the returned paused/error status. Do not fall back to a second source-root board.

## Implementation notes

- Reuse the existing orphan marker and real-Git worktree flow; do not redesign synchronization or alter CORE-082 lock/ignore rules.
- Keep board-root ignore refusal behavior and all existing paused/error semantics.
- Use deterministic fixtures and real Git where practical. Tests must prove source edits are not removed on version conflict and canonical boardRoot is retained on source-ignore refusal.
- Record exact command exit codes, preserving any first failure. Live packaged multi-process races remain INCONCLUSIVE unless directly exercised.

## Governing docs and risks

FRD-027-project-declared-sources.md and ADR-0020-project-declared-source-trust.md govern this bounded source/board state behavior. No provider, resolver, migration, lock, or GUI scope is included. The fingerprint closes the known copy-to-cleanup window; broader filesystem/network race guarantees remain explicitly deferred.
