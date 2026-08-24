# Checklist — GUI-128

## Investigation

- [x] Identify the static Notification API and incomplete test mock.
- [x] Confirm all sync assertions pass before the unhandled-error exit.
- [x] Confirm the settings atomic-write failure is separate.

## Implementation

- [x] Add only the static unavailable-notification mock member.
- [x] Preserve production and test behavior outside the mock.

## Verification

- [x] Focused sync suite exits 0 with no unhandled errors: 11/11 PASS.
- [x] Run typecheck: PASS across all workspaces.
- [x] Run `git diff --check`: PASS.
- [ ] Run canonical GUI/root verification and record independent outcomes; hosted PR result pending.
- [ ] Write post-implementation report, open PR, and hand to review.
