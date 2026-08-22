# Checklist — CORE-081

## Preparation

- [x] Read CORE-026 item, links, group context, current review attestation, and governing FRD/ADR.
- [x] Confirm implementation starts from cumulative CORE-026 head `3a05ab7a21f55152a4f493169300ac9e622baab7`.

## Implementation

- [x] Preserve validators across same-origin manifest redirects.
- [x] Cancel response bodies on every early-abandon path.
- [x] Wait/reuse active refresh beyond the short lock retry window.
- [x] Make request identity/`Content-Encoding` handling explicit.
- [x] Charge partial body-read failures to the aggregate byte budget.
- [x] Enforce the 32-page Markdown link cap without extra fetches.
- [x] Surface uncached linked-page `304` without caching an empty document.
- [x] Add deterministic regressions and update FRD-027/ADR-0020 as needed. (Existing FRD-027/ADR-0020 already state these boundaries; no governing-doc edit was necessary.)

## Verification and handoff

- [x] Run focused source tests and required package/type/script checks; record exit codes.
- [x] Run `git diff --check` and preserve any inherited failures without weakening assertions.
- [x] Write the post-implementation report with exact commit/PR and review-finding dispositions.
- [x] Open the PR targeting the CORE-026 branch and stop at Review.
- [ ] Post-merge proof on merged main.
