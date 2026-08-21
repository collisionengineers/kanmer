# Open questions — MCP-033

- [x] Is a source/build-system redesign required? — No. [[MCP-030]] establishes normal main as the only canonical bundle producer; preserve strict checking.
- [x] May this change weaken `plugin:check`? — No.
- [x] Is the normal-main generated artifact sufficient? — Yes, provided its diff is limited to generated resolution-path comments/wrapper labels and post-merge check passes.

## Parked (explicitly deferred)

None.
