## Review hand-off — 2026-08-28

- **PR:** https://github.com/collisionengineers/kanmer/pull/303
- **Head SHA:** `abf707d98a2ddbde02dafb31cc652c72bbea73b6`
- **Base:** `origin/main` `70d23efd`
- **Branch / worktree:** `core-132-release-channel-leases` / `.worktrees/core-132` (kept; the ticket stays taken through review, verify and closeout)
- Ticket moved Implementing → Review after `get_doc_gates` reported the boundary passable.
- The author does not review, merge, resolve review threads, file follow-up tickets or start another ticket. `main` sets `required_conversation_resolution: true`, so the PR will read `BLOCKED` until a reviewer resolves its threads — that is expected, not a defect.

2026-08-31 final root-cause remediation head: `244e9143abffb2066db4e8e9912e4122a3b79b9e` (verified with `git rev-parse HEAD`). Corrected a transient board metadata typo immediately; this exact SHA is authoritative. The pass fixes coherent fail-closed release snapshots, serializes delivery-policy writes with candidate minting, replaces every candidate wildcard, refuses Windows device channels, indexes successor evidence, and resolves configured integration branches through `refs/heads`. Focused results before push: core release 67/67, full core 629/629, MCP release 20/20, core and MCP typechecks PASS, plugin/skill/AGENTS/manual checks PASS.
