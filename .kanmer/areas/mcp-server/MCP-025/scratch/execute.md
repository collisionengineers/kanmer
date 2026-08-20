Committed 3cd793d and opened draft PR https://github.com/collisionengineers/kanmer/pull/90. Kept in Implementing: MCP-026's concrete bearer authorizer and additional lifecycle/limit coverage remain required; see post-implementation report.

Resumed transport scope and pushed e59f37e. Safe stop: FRD-025 RA-AUTH-1 requires real Bearer validation, which MCP-026 owns. MCP-025 exposes only the injected HttpAuthorizer seam; do not add bearer parsing/storage/comparison/generation here. Resume lifecycle expansion in .worktrees/mcp-025 after MCP-026 can inject its real authorizer.
