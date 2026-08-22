# Plan

1. Use non-following filesystem metadata to detect a symlink at `.gitignore`.
2. Refuse reconciliation with an actionable error before reading or writing the target.
3. Add deterministic symlink and target-integrity coverage, then run the full rails.
