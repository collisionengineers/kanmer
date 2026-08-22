# Checklist — CORE-081

## Preparation

- [ ] Read CORE-026 item, links, group context, current review attestation, and governing FRD/ADR.
- [ ] Confirm implementation starts from cumulative CORE-026 head `3a05ab7a21f55152a4f493169300ac9e622baab7`.

## Implementation

- [ ] Preserve validators across same-origin manifest redirects.
- [ ] Cancel response bodies on every early-abandon path.
- [ ] Wait/reuse active refresh beyond the short lock retry window.
- [ ] Make request identity/`Content-Encoding` handling explicit.
- [ ] Charge partial body-read failures to the aggregate byte budget.
- [ ] Enforce the 32-page Markdown link cap without extra fetches.
- [ ] Surface uncached linked-page `304` without caching an empty document.
- [ ] Add deterministic regressions and update FRD-027/ADR-0020 as needed.

## Verification and handoff

- [ ] Run focused source tests and required package/type/script checks; record exit codes.
- [ ] Run `git diff --check` and preserve any inherited failures without weakening assertions.
- [ ] Write the post-implementation report with exact commit/PR and review-finding dispositions.
- [ ] Open the PR targeting the CORE-026 branch and stop at Review.
- [ ] Post-merge proof on merged main.
