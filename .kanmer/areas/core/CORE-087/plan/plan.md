# Plan

1. Reproduce the exact-head mismatch between a linked worktree build and the committed plugin bundle.
2. Generate the artifact from a normal checkout at the CORE-026 cumulative head, or make the build output path-independent if that is the root cause.
3. Run the authoritative plugin/mcpb parity checks and focused source/core rails.
4. Record the exact artifact SHA and hand the ticket to independent review.

## Governing docs

- `docs/functional/frd/FRD-027-project-declared-sources.md`
- `docs/architecture/adr/ADR-0020-project-declared-source-trust.md`
