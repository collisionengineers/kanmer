# Plan

Validate the environment at **write** time, not at move time: a profile naming
`@staging` on a board with no `staging` environment is a configuration error,
and surfacing it when someone tries to move a ticket would blame the wrong
action.

Compute the warning inside `evaluateGateReport` rather than at the call site, so
MCP and the GUI cannot disagree about whether something is warned.

Warnings are collected on the report *and* attached to the individual
requirement, so a caller can render them inline or as a list.
