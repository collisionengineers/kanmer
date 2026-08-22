# Open questions

- [x] Should GUI-109 create groups? No. It discovers existing active groups only; group creation remains the agent/MCP contract in FRD-001 G5.
- [x] Should selecting a group replace memberships? No. Re-read the latest ticket and append only when absent, preserving every existing group.
- [x] How are archived or unknown groups handled? Archived groups are omitted by the existing active `listGroups()` call; core `updateItem` remains the final unknown-id validator.
- [x] Is a new IPC/MCP/core model needed? No. Reuse the existing typed listGroups/updateItem path.
- [x] What evidence can be claimed without a desktop session? Deterministic tests and rails can be PASS; live menu interaction and screenshot remain explicitly INCONCLUSIVE.

## Parked (explicitly deferred)

- Live Electron context-menu selection and visual screenshot: INCONCLUSIVE because no controlled interactive desktop session is available in this lane.
