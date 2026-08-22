# Checklist — CORE-047

- [ ] Read CORE-046 packet, independent attestation, HZN-007 context, FRD-027, and ADR-0020.
- [ ] Reproduce the reversed-order replacement-lock race deterministically.
- [ ] Implement ownership-safe atomic quarantine/reclaim semantics.
- [ ] Preserve inherited IO atomic-write/rename/TMP_FILE_RE assertions.
- [ ] Add and pass the reversed-order concurrent regression.
- [ ] Run focused IO/core rails and relevant typecheck/build checks.
- [ ] Update report with exact SHA, tests, and external INCONCLUSIVE boundaries.
- [ ] Move Implementing→Review only after gates pass; stop for independent review.
