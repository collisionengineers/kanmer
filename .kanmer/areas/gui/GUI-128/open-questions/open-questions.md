# Open questions — GUI-128

## Resolved

- [x] Should the mock report notifications available? No. Returning `false` is sufficient and avoids inventing a constructor/output behavior irrelevant to the sync tests.
- [x] Does this require a production change? No. The production guard is the intended caller; only the test double is incomplete.
