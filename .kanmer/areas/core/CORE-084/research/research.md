# Research — CORE-084: manual Retry production-caller coverage

## Question

What evidence is missing from CORE-080's otherwise-correct manual Retry preflight?

## Findings

- CORE-080 adds `preflightBoardSync` and wires it into `syncProject`, but its new tests call the helper directly.
- The review requires a regression through the production `syncProject` Retry path proving a live branch mismatch returns the paused state before `syncBoard` and performs no ref mutation.
- Existing exact-destination and genuine-error tests must remain unchanged; this is a test/coverage remediation, not a second implementation.

## Implications

Add one production-caller test using the existing GUI Git fixture seams, update the cumulative CORE-043 packet, and retain the current deterministic rails and external-protection limitation.
