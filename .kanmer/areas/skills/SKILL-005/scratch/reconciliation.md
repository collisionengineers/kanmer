## 2026-08-22 merged-main reconciliation

Historical implementation `21b53a7` is reachable from origin/main via merge `5c1bfb5`; fresh `.worktrees/skill-005` at `af61144ce743f74b2aba92fb0778588b0b9bedd0` has no scoped source diff.

Evidence: verify:agents-block 31/31 exit 0; verify:skills all 13 exit 0; agents-block regeneration twice with clean AGENTS.md diffs; residue scan 0; build:core exit 0; test:scripts first exit 1 from missing core dist (78/80, 2 missing-dist failures) then 80/80 exit 0 after build; typecheck, diff-check, ancestor and scoped-diff checks exit 0.

Checklist 9/9 and report were updated/read back. The first missing-build failure is preserved. Agent onboarding/live behavior remains unclaimed; existing proof is historical and was not rewritten before independent Review.
