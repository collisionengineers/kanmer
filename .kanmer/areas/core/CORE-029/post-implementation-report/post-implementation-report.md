# Post-implementation report — CORE-029

## Summary

Corrected the hand-authored AGENTS.md data-model contract from format 2’s configurable seven stages to format 3’s six fixed stages and profile-resolved move gates. The skill-prose verifier now includes AGENTS.md in its existing v2-stage check.

## Changes

| Path | Change |
|---|---|
| `AGENTS.md` | Replaced the stale seven-stage/configurable-final-gate passage with the six fixed stage sequence and profile-resolved gate explanation, outside the managed block. |
| `scripts/verify-skill-prose.mjs` | Limited the AGENTS addition to check 2’s stage-name audit; other skill-only checks retain their original scope. |
| `scripts/verify-skill-prose.test.mjs` | Added a temporary-fixture regression test proving an AGENTS v2 stage sequence fails. |

## Verification

- `node --test scripts/verify-skill-prose.test.mjs`: 1/1 passed.
- `npm run verify:skills`: all eight checks passed.
- `npm run verify:agents-block`: 28/28 passed.
- `git diff --check`: passed.
- PR [#71](https://github.com/collisionengineers/kanmer/pull/71) is ready for review.
