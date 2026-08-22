# CORE-040 checklist

## Preparation

- [x] Reproduce the hosted missing-tag failure and record its run/job and 79/80 result.
- [x] Confirm ISO date is a supported release-notes cutoff.

## Implementation

- [x] Replace only the test cutoff with a deterministic ISO date before CORE-027 Done.
- [x] Preserve canonical PR-link and no-shorthand assertions.

## Verification

- [x] Run focused release-notes test and npm run test:scripts (80/80).
- [x] Run build, typecheck, and diff-check; record exact exits.
- [ ] Rerun shared verify on the final stacked branch and preserve unrelated failures exactly.
- [x] Write post-implementation report and record commit/PR traceability.
- [x] Stop at Review for independent review.

## Progress notes

- 2026-08-22: Hosted PR #145 run 32543948316 failed because shallow CI lacked tag v0.3.2; exact error and 79/80 result preserved.
- 2026-08-22: Commit 6f17bccf changes only the test cutoff to 2026-08-20T00:00:00.000Z; build, focused 1/1, scripts 80/80, typecheck and diff-check pass. Final stacked shared verify awaits CORE-040 stacking.
- 2026-08-22: Independent review PASS by /root/gui099_executor; no blocking findings.
