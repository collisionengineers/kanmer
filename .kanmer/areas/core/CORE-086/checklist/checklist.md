# Checklist

- [ ] Confirm exact cumulative base fcd998550714811edac99032ea7118f9b2084d38 and recorded branch/worktree.
- [ ] Take CORE-086 through MCP without force.
- [ ] Build/regenerate plugins/kanmer/mcp/kanmer-mcp.cjs from the exact cumulative tree.
- [ ] Confirm generated diff is limited to the committed plugin artifact; preserve all source/parity assertions.
- [ ] Re-run the 26/26 source evidence and 303/303 core evidence, recording exact exits.
- [ ] Run plugin:check and record its exact exit/output.
- [ ] Run mcpb:check or preserve the exact local CLI-unavailable INCONCLUSIVE result; do not weaken the check.
- [ ] Run relevant build/typecheck/scripts/diff rails and preserve first failures.
- [ ] Write post-implementation report mapping scope, SHA, rails, hosted limitations, and external proof boundaries.
- [ ] Push/open ticket-linked PR against core-026-project-declared-sources and record commit/PR traceability.
- [ ] Move Implementing→Review after a fresh get_doc_gates readback.
- [ ] Post-merge verification and proof remain unchecked for the independent merge/verify lane.
