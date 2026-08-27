# Open questions — CORE-114

None blocking. Decisions taken from the FRD/context and recorded here so the plan does not silently assume them.

## Parked (explicitly deferred)

- [ ] Should `expected_project` / `expected_revision` become mandatory on mutations? FRD-029 phrases it as a client obligation ("every mutation carries"); the server keeps them optional in this PR because installed v0.3.12 skills and `smoke-protocol.mjs` require optional schemas. Enforcement belongs with the endpoint registry (MCP-054) and a skill rollout.
- [ ] `board_id` distinct from `project_id`: FRD says "when distinct". This PR writes `board_id` equal to `project_id` by default (single board per project today); a distinct value is reserved for multi-board projects (MCP-054+).
- [ ] Should `scratch/` and `reference/` be included in the document-inclusive revision? Decision here: excluded — both are gate-exempt notes/inputs and agents append scratch continuously; including them would make every note a conflict. Revisit if reconciliation (CORE-122 successor) needs it.
