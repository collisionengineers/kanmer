---
kind: proof-record
merged_sha: "2ad513e706f6b098bcec72d0e5b6c42344d12eec"
prs:
  - "https://github.com/collisionengineers/kanmer/pull/254"
result: PASS
verified_at: "2026-08-25T01:05:00Z"
---

# Production spine verification

## Production protection

The live `main` protection requires `verify` and `kanmer-gate`, requires resolved conversations, enforces rules for administrators, and disables force pushes and deletion. It requires **0 GitHub approving reviews**.

The earlier disposable fixture's one-approval requirement was not production configuration and is retained only as fixture-specific refusal-path evidence.

## Protected merge specimen

- PR: https://github.com/collisionengineers/kanmer/pull/254
- Merge commit: `2ad513e706f6b098bcec72d0e5b6c42344d12eec`
- Merged at: 2026-08-25T00:38:09Z
- Required `verify`: PASS
- Required `kanmer-gate`: PASS

The merge occurred through the actual protected production branch. The resulting current main was then validated in a clean clone: full repository verification, Windows packaging, and updater-package checks passed.

## Retained negative evidence

The existing fixture matrix remains useful for `NO_TICKET`, `WRONG_STAGE`, dependency, unresolved-question, review-record/staleness, and commit-reachability gate behavior. The fixture's approval configuration is non-authoritative and no longer blocks this ticket.

## Result

**PASS.** The production workflow, protection, required checks, normal merge path, and merged-main verification are all evidenced without a bypass, rule weakening, or second GitHub identity.
