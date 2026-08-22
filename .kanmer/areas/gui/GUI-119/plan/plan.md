# GUI-119 plan

1. Trace the saved branch from project settings through OpenAI, remote-access, and Claude marketplace production callers.
2. Thread `KANMER_BOARD_BRANCH` through provider-owned environment/argv seams, preserving literal defaults and user-global ownership.
3. Add deterministic production-caller regressions for custom branch values and shell-hostile values where relevant.
4. Run GUI/typecheck/build/docs/scripts/diff rails, update CORE-043 packet, and stop at Review.

Governing refs: FRD-020, FRD-012, ADR-0016. Live provider/remote host proof remains INCONCLUSIVE.
