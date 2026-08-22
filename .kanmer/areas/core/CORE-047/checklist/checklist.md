# Checklist — CORE-047

- [x] Read CORE-046 packet, independent attestation, HZN-007 context, FRD-027, and ADR-0020.
- [x] Reproduce the reversed-order replacement-lock race deterministically.
- [x] Implement ownership-safe atomic quarantine/reclaim semantics.
- [x] Preserve inherited IO atomic-write/rename/TMP_FILE_RE assertions.
- [x] Add and pass the reversed-order concurrent regression.
- [x] Run focused IO/core rails and relevant typecheck/build checks.
- [x] Update report with exact SHA, tests, and external INCONCLUSIVE boundaries.
- [x] Move Implementing→Review only after gates pass; stop for independent review.
