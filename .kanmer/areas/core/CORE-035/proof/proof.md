---
kind: proof-record
merged_sha: "c8ea0b778895b0a76d9e32152a1f58c7b3b3d77b"
prs:
  - "https://github.com/collisionengineers/kanmer-spine-integration-20260822t075446z-78e5ba65/pull/1"
  - "https://github.com/collisionengineers/kanmer-spine-integration-20260822t075446z-78e5ba65/pull/2"
result: INCONCLUSIVE
verified_at: "2026-08-22T08:32:00Z"
---

## Verification

This is an INCONCLUSIVE integration proof, not a protected-merge PASS. The exact production source snapshot under test was `c8ea0b778895b0a76d9e32152a1f58c7b3b3d77b` (merged CORE-025); no disposable fixture merge SHA exists.

- Exact-source `npm run verify`: PASS.
- Disposable fixture focused test: 2/2 PASS; disposable typecheck PASS.
- Local gate/refusal matrix recorded `NO_TICKET`, `WRONG_STAGE`, `DEPENDENCY_BLOCKED`, `OPEN_QUESTIONS`, `NO_REVIEW_RECORD`, `STALE_REVIEW`, and `COMMITS_UNREACHABLE`, followed by a local gate PASS with the reachable fixture commit.
- Hosted run `32561867341`: `kanmer-gate` PASS (`97005242239`); `verify` failed 84/85 on the disposable-origin release-notes URL mismatch, retained as environment-specific.
- Independent review PASS for packet integrity/safety, attestation version `210e5aeabd082ba9`, plan hash `080f162d2b51e7ce`.

### Blocking external boundary

GitHub branch-protection PUTs for both disposable private `main` and `kanmer-board` returned HTTP 403: “Upgrade to GitHub Pro or make this repository public to enable this feature.” Therefore protected conversation blocking, protected merge, exact merge SHA, detached merged-main verification, and final disposable cleanup are not proved. The fixture PRs remain open; no bypass, rule weakening, or fabricated PASS was performed. The ticket remains Verifying until an operator supplies a disposable repository with branch-protection capability.


## Closeout disposition

The implementation source is reachable on merged main through the recorded cumulative trace. The protected disposable-repository boundary returned HTTP 403 and cannot be rerun in the available environment; this remains explicitly INCONCLUSIVE/accepted-risk, not a fabricated PASS. The ticket is closed because no in-scope source work remains and the limitation is recorded for the controlling release/integration follow-up.
