# Checklist — CORE-078

- [ ] Identify the successful manual retry path and re-arm the canonical automatic-sync timer only after success.
- [ ] Preserve paused/error state on failure and add deterministic fake-timer regression coverage.
- [ ] Run focused GUI, core, scripts, build/manual, typecheck, and diff rails; preserve inherited failures exactly.
- [ ] Write the post-implementation report, record commit/PR traceability, open the stacked PR, and hand off at Review.
