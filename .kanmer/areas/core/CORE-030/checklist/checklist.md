# Checklist — CORE-030

- [ ] Restrict `SKILL_DESTINATIONS` in `packages/core/src/staleness.ts` to the current copy-skills destinations and document the ownership rule.
- [ ] Preserve existing hash, missing-skill, retired-skill, and stamp detection for owned destinations.
- [ ] Move positive staleness fixtures away from `.claude/skills` to an owned destination.
- [ ] Add regression coverage proving a handmade `.claude/skills` tree (including `run-kanmer`) produces no skills/stamp rows.
- [ ] Run focused and full `@kanmer/core` tests plus its typecheck.
- [ ] Run `git diff --check` and verify [[GUI-090]] remains the sole owner of the provider-to-core roster inversion.
