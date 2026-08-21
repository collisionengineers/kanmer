# Open questions — MCP-034

All three independent-review findings have a resolved implementation decision:

- [x] **How should Windows-looking vectors resolve on non-Windows hosts?** Detect Windows absolute drive/UNC inputs and use `path.win32.resolve`; use native `path.resolve` for native paths. Preserve slash, drive-letter, trailing-root, payload-order, and `boardSource` rules.
- [x] **Which errors receive `GATE_BLOCKED`?** Add only core's single-boundary `leaving … requires …` form to the existing `entering … requires …` and collapsed `cannot move … crosses …` forms. Keep unrelated validation and generic “blocked” text uncoded.
- [x] **Where should the convention be documented?** Add the optional top-level `expected_project`/capability-sniffing rule and the `readOnlyHint: false` central-guard dependency to the user-owned prose of `AGENTS.md`; leave the managed marker block, setup skill fence, and tool-reference contract unchanged.
- [x] **What remains unchanged?** No new token semantics, mandatory rollout, error codes, tools, dependencies, core gate wording, or MCP-023 work. Rebuild the committed plugin artifact because the server source changes.

## Parked (explicitly deferred)

No questions are parked.
