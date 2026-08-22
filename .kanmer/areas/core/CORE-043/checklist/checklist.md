# CORE-043 checklist

- [ ] Add the protected-default branch constant and fail-closed rename refusal before any Git mutation.
- [ ] Preserve the old persisted branch preference when an open-project rename is refused; apply sync interval independently.
- [ ] Add real-Git refusal/ref consistency coverage and retain custom-branch history/remote ordering coverage.
- [ ] Add closed-project reconciliation refusal coverage.
- [ ] Update Settings, FRD-020, manual chapters, and regenerate the bundled manual.
- [ ] Run focused GUI Git tests.
- [ ] Run full GUI tests.
- [ ] Run all-workspace typecheck.
- [ ] Run manual/docs/build/diff rails and capture exact outcomes.
- [ ] Write post-implementation report, commit/push, record commit/PR, and move to Review.

## Stop condition

Stop at Review after the independent-review-ready packet is complete. Do not merge or self-review.
