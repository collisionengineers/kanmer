# CORE-040 plan

## Governing docs

docs_todo is true. This is a bounded clean-CI test repair governed by AGENTS.md verification rules; no new FRD/ADR is needed.

## Approach

Replace the regression test's tag-dependent cutoff with a deterministic ISO date before the documented CORE-027 Done timestamp. Keep release-notes production tag resolution unchanged and preserve the canonical PR-link assertions. Run focused test, scripts 80/80, build/typecheck/diff-check, and shared verify; preserve independent failures.
