# Checklist — GUI-128

## Investigation

- [x] Identify the static Notification API and incomplete test mock.
- [x] Confirm all sync assertions pass before the unhandled-error exit.
- [x] Confirm the settings atomic-write failure is separate.

## Implementation

- [ ] Add only the static unavailable-notification mock member.
- [ ] Preserve production and test behavior outside the mock.

## Verification

- [ ] Focused sync suite exits 0 with no unhandled errors.
- [ ] Run typecheck.
- [ ] Run `git diff --check`.
- [ ] Run canonical GUI/root verification and record independent outcomes.
- [ ] Write post-implementation report, open PR, and hand to review.
