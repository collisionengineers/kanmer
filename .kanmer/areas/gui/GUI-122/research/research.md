# Research

GUI-118 PR #219 is based on the pre-GUI-119 CORE-043 head. GUI-119 merged
the provider-specific `KANMER_BOARD_BRANCH` propagation for OpenAI, remote,
and Claude. Reusing GUI-118 without integrating the current CORE-043 head
would reintroduce that defect. The bounded fix is an integration-only merge
of `origin/core-043-protection-retarget` into the GUI-118 branch, followed by
focused rails and a fresh cumulative review.

## Acceptance evidence

- Current CORE-043 head is retained byte-for-byte for GUI-119 provider paths.
- GUI-118 lifecycle changes remain present after conflict resolution.
- Focused GUI/provider/connect/index-sync rails, typecheck, build, scripts,
  and diff checks are recorded in the implementation report.
