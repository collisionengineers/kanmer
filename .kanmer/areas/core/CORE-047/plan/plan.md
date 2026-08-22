# Plan — CORE-047

1. Read the exact CORE-046 implementation and attestation; reproduce the reversed-order race with an injected ordering seam.
2. Replace the stale-lock reclaim handoff with an ownership-safe atomic quarantine protocol. A reclaimer may only delete the exact inode it atomically owns; a replacement at the original path must remain untouched.
3. Add a deterministic regression for the losing reclaimer after the winner has recreated the original lock, while retaining the existing forward-order test and all inherited IO assertions.
4. Run focused IO/core rails, typecheck/build as relevant, update checklist and post-implementation report, and move to Review for independent review.

## Acceptance

- Reversed-order test fails on the old implementation and passes on the fix.
- No fresh replacement lock can be quarantined or deleted by a stale reclaimer.
- Existing IO test assertions remain intact; no swallowed errors or broad catch added.
