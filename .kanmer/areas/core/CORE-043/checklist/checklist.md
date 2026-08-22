# CORE-043 checklist

- [x] Add the protected-default branch constant and fail-closed rename refusal before any Git mutation.
- [x] Preserve the old persisted branch preference when an open-project rename is refused; apply sync interval independently.
- [x] Add real-Git refusal/ref consistency coverage and retain custom-branch history/remote ordering coverage.
- [x] Add closed-project reconciliation refusal coverage.
- [x] Update Settings, FRD-020, manual chapters, and regenerate the bundled manual.
- [x] Run focused GUI Git tests — PASS, 14/14.
- [x] Run full GUI tests — attempted; base dispatch/provider parity failures preserved in scratch/report.
- [x] Run all-workspace typecheck — attempted; base dispatch export/provider failures preserved in scratch/report.
- [x] Run manual/docs/build/diff rails and capture exact outcomes — manual/docs/diff PASS; GUI build base dispatch export failure preserved.
- [x] Write post-implementation report, commit/push, record commit/PR, and move to Review.

## Stop condition

Stop at Review after the independent-review-ready packet is complete. Do not merge or self-review.
