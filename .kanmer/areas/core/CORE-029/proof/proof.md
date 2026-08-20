# Verification — CORE-029

Verified on merged `main` at `4a63c7ce25bda4cae52b8935b0ae0f05747094c2` after PR [#71](https://github.com/collisionengineers/kanmer/pull/71) merged on 2026-08-20.

- `node --test scripts/verify-skill-prose.test.mjs` passed: the temporary stale AGENTS fixture is rejected.
- `npm run verify:skills` passed all eight checks, including the AGENTS-aware stage-drift audit.
- `npm run verify:agents-block` passed 28/28; the managed block remains unchanged.
- `git diff --check` passed.

AGENTS.md now presents the six fixed stages and profile-resolved gates, with automated regression coverage for the prior v2 stage sequence.
