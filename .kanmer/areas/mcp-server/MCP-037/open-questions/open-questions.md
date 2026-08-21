# MCP-037 open questions

## Resolved

- **Does the fix need a new public API?** No. The existing private rollback path is sufficient.
- **Should the listener bind before project resolution?** No. MCP-036's pre-bind ordering remains required.
- **Does this add auth or tunnel behavior?** No; those remain MCP-026/MCP-021 scope.

## Parked (explicitly deferred)

None.
