# CORE-040 checklist

## Preparation

- [x] Reproduce the hosted missing-tag failure and record its run/job and 79/80 result.
- [x] Confirm ISO date is a supported release-notes cutoff.

## Implementation

- [ ] Replace only the test cutoff with a deterministic ISO date before CORE-027 Done.
- [ ] Preserve canonical PR-link and no-shorthand assertions.

## Verification

- [ ] Run focused release-notes test and npm run test:scripts (80/80).
- [ ] Run build, typecheck, diff-check, and shared verify; preserve unrelated failures.
- [ ] Write post-implementation report and record commit/PR traceability.
- [ ] Stop at Review for independent review.
