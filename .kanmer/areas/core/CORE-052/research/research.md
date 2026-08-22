# Research

CORE-043's cumulative review at head `11930038542d402865bb26a23787d7d3cad3e2c5` passed its hosted gate but retained four correctness/documentation findings: the `KANMER_BOARD_BRANCH` Actions-variable handoff is not explicit; refresh can accept a stale branch snapshot instead of proving equality with the requested destination; refresh can overwrite a paused/error state; and `troubleshooting.md` contradicts the supported rename flow. The code, tests, workflow documentation, and generated in-app manual are the affected surfaces. Reuse CORE-043's branch-sync state machine and existing manual generation source; do not add a second branch-selection path. Live GitHub protection-retarget evidence remains external and must stay INCONCLUSIVE.

Evidence: independent review attestation `6e6bbace7c77def8`, hosted run `32571224767` (verify and kanmer-gate PASS), PR #168 exact head above.
