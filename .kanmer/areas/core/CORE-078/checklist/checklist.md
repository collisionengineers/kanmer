# Checklist — CORE-078

- [x] Identify the successful manual retry path and re-arm the canonical automatic-sync timer only after success.
- [x] Preserve paused/error state on failure and add deterministic fake-timer regression coverage.
- [x] Run focused GUI, core, scripts, build/manual, typecheck, and diff rails; preserve inherited failures exactly.
- [ ] Write the post-implementation report, record commit/PR traceability, open the stacked PR, and hand off at Review.
