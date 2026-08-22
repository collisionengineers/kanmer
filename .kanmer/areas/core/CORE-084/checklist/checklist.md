# Checklist — CORE-084

## Preparation

- [ ] Read CORE-080/CORE-043 packets, review scratch, group context, and governing docs.
- [ ] Confirm the implementation base is CORE-080 head `0e1be5f32efad1da57ee27bd2a2fe80033976bd1`.

## Implementation

- [ ] Add the production `syncProject` manual Retry mismatch regression.
- [ ] Assert no `syncBoard` call and no ref mutation.
- [ ] Preserve exact-destination and genuine-error assertions.
- [ ] Update cumulative packet/review dispositions.

## Verification and handoff

- [ ] Run focused GUI, typecheck, script, and diff checks with exit codes.
- [ ] Write the post-implementation report and update the checklist.
- [ ] Open a PR targeting `core-043-protection-retarget`; stop at Review.
- [ ] Post-merge proof on merged main.
