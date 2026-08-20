# Checklist — CORE-030

- [x] Restrict `SKILL_DESTINATIONS` in `packages/core/src/staleness.ts` to the current copy-skills destinations and document the ownership rule.
- [x] Preserve existing hash, missing-skill, retired-skill, and stamp detection for owned destinations.
- [x] Move positive staleness fixtures away from `.claude/skills` to an owned destination.
- [x] Add regression coverage proving a handmade `.claude/skills` tree (including `run-kanmer`) produces no skills/stamp rows.
- [x] Run focused and full `@kanmer/core` tests plus its typecheck.
- [x] Run `git diff --check` and verify [[GUI-090]] remains the sole owner of the provider-to-core roster inversion.

## Progress notes

Kept GUI provider registration untouched. [[GUI-090]] remains responsible for replacing the temporary duplicated destination roster with a shared source of truth.

## Closeout

- [x] Confirm PR #73 merged and record merged-main proof.
- [x] Re-inventory and read every ticket document, including nested scratch files.
- [x] Confirm the ticket worktree is clean, release it, and remove its merged worktree and local branch.
