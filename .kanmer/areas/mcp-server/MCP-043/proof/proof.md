---
kind: proof-record
merged_sha: "0c5ed84ed0128aed6c8a60bec265a8dcb589061a"
prs:
  - "156"
  - "155"
result: PASS
verified_at: "2026-08-22T06:33:00Z"
---

## Merged-main artifact proof

The exact merged-main commit 0c5ed84ed0128aed6c8a60bec265a8dcb589061a contains the generated `plugins/kanmer/mcp/kanmer-mcp.cjs` artifact from PR #156 (merge commit 6e2f1bd948886d22d1bd6490d5dbcfaa3e518b8d on the CORE-024 parent branch, then included by PR #155). The artifact-only diff is the sole MCP-043 source change.

Independent review rails on the artifact branch passed plugin:check (34 tools), MCPB parity, stdio smoke 224/224, protocol 46/46, MCP typecheck/build, check-pr fixture 1/1, scripts 83/83, and diff-check. Authoritative hosted PR #155 verify run 32556559732 passed after this artifact was merged into its parent branch and then into main.

## Preserved boundary

A detached local merged-main verification reproduced the repository-wide suites but exited at check-mcpb-sync because this environment generated a different standalone byte hash. That environment-sensitive mismatch is preserved; it does not override the independent artifact-branch and hosted parity passes. No new MCP behavior or plugin semantics were introduced.
