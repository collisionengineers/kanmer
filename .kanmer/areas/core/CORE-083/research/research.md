# CORE-083 research

## Scope and exact base

CORE-083 remediates CORE-026 review findings #3836536180 and #3836536184. It is based on cumulative CORE-026 head `a9833df28ddf6f91966be17a4eb7c06265e088ed`, the non-main feature branch after CORE-082/PR #209 merged. The PR remains stacked on `core-026-project-declared-sources`.

## Findings

- `apps/gui/src/main/kanmerGit.ts`'s `resumeOrphanMigration` copies source `.kanmer` into the canonical board worktree, commits/pushes it, then unconditionally `git rm`s the source tree. A source-root agent edit between copy and cleanup can be discarded. The orphan marker is currently empty, so no copied-source version is recorded.
- `ensureIgnore` rejects symlinked ignore paths. Board-root rejection is intentionally paused with the canonical `boardRoot` retained, but source-root `.gitignore` reconciliation occurs outside the protected return path and the outer catch returns `boardRoot: null`. GUI openProject can then fall back to the source checkout and create a second board root.
- Existing CORE-082 ignore rules and atomic lock behavior are inherited and must remain unchanged.

## Safe approach

Record a deterministic fingerprint of the copied source `.kanmer` tree in the orphan marker. Immediately before source cleanup, reread and compare that fingerprint; on mismatch or malformed/legacy marker, preserve both trees and return paused/error rather than deleting source state. Keep the source cleanup guarded by the existing successful board push and commit sequence. Add a deterministic source-edit-before-cleanup seam/test.

Every source-root ignore reconciliation failure must return a paused status retaining the already-established canonical board root. The board-root ignore failure path and all existing error/paused semantics remain intact.

## Governing docs and boundaries

FRD-027 and ADR-0020 govern the project board/source state; FRD-020 governs board Git worktree synchronization. This ticket changes no source resolver, lock, provider, migration, or unrelated GUI behavior. Live multi-process edits and packaged GUI fallback behavior remain INCONCLUSIVE unless deterministic local rails prove them.
