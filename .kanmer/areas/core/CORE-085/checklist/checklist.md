# Checklist — CORE-085

## Preparation

- [ ] Read CORE-081/CORE-026 packets, review comments, group context, and governing docs.
- [ ] Confirm base is CORE-081 head `13b6ce22a8363c0f467e96c775eb9a09891b7bb2`.

## Implementation

- [ ] Scope validators to the final redirect target.
- [ ] Preserve forced refresh semantics when joining an active refresh.
- [ ] Add multi-hop validator and concurrent-force regressions.
- [ ] Update cumulative packet dispositions.

## Verification and handoff

- [ ] Run source/core/typecheck/server/scripts/diff checks and record exit codes.
- [ ] Write post-implementation report and update checklist.
- [ ] Open PR targeting `core-026-project-declared-sources`; stop at Review.
- [ ] Post-merge proof on merged main.
