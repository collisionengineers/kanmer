# CORE-083 files and impact

## In scope

- `apps/gui/src/main/kanmerGit.ts`: record/verify orphan source-tree version before `git rm`; retain canonical board root on source `.gitignore` refusal.
- `apps/gui/src/main/kanmerGit.test.ts`: real-Git regression for source edit/version conflict, paused/error preservation, and symlinked source ignore retaining boardRoot.
- Generated artifacts only if required by the repository build; no unrelated GUI or core files.

## Context files

- `apps/gui/src/main/kanmerGit.ts`: orphan creation/resume, ignore reconciliation, board-root status contract.
- `apps/gui/src/main/kanmerGit.test.ts`: real-Git fixture and inherited board-root/ignore assertions.
- FRD-020, FRD-027, ADR-0020, and HZN-007 context: board source-of-truth, canonical root, bounded source state, and workflow gates.

## Out of scope

Do not change source fetching, lock ownership, provider registration, board migration, CORE-026 parent stage/merge, CORE-082, or external/live filesystem claims.
