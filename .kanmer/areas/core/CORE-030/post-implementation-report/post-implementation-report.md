# Post-implementation report — CORE-030

## Delivered

- Removed `.claude/skills` from core’s `SKILL_DESTINATIONS`; it is a marketplace-provider mirror Kanmer never reconciles.
- Kept the three actual copied-skill destinations: `.opencode/skills`, `.agents/skills`, and `.grok/skills`.
- Moved positive staleness fixtures to an owned destination, retaining changed, missing, retired, and stamp coverage.
- Added regression coverage for a handmade Claude mirror containing stale-looking `kanmer-plan` and user `run-kanmer` folders; it produces neither skills nor skills-stamp rows.

## Scope boundary

No GUI/provider changes were made. [[GUI-090]] retains ownership of the eventual provider-to-core roster inversion.

## Verification

- `npm test -w @kanmer/core -- staleness.test.ts` — 40 tests passed.
- `npm test -w @kanmer/core` — 250 tests passed.
- `npm run typecheck -w @kanmer/core` — passed.
- `git diff --check` — clean.
