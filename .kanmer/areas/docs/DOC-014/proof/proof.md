# Proof — DOC-014

## Merged state

- PR [#72](https://github.com/collisionengineers/kanmer/pull/72) merged to `main` at `aa7e0c04e07d4e4e6ec5ceb8e8e6e34efdda8f38` on 2026-08-20.
- `plugins/kanmer/skills/kanmer-docs/assets/agents-template.md` exists on merged main with the five user-owned guide sections, a Commands table, and deterministic-first verification guidance.
- `kanmer-docs/SKILL.md` points to the asset only for an absent AGENTS.md and preserves existing human-authored prose.

## Verification on merged main

- `node --test scripts/verify-skill-prose.test.mjs` — 2 passing tests.
- `npm run verify:skills` — all checks passed.
- `git diff --check` — clean.
