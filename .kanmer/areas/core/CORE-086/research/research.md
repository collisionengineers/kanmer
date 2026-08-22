# Research

## Scope and evidence

CORE-086 is a bounded release-artifact remediation for the exact cumulative CORE-081 tree fcd998550714811edac99032ea7118f9b2084d38 (CORE-081 13b6ce22 plus CORE-085 b2c51779 merged non-squash). The hosted PR #163 verify run 32591279782 reported that the MCPB server differed from the committed plugins/kanmer/mcp/kanmer-mcp.cjs after the source transport/cache changes. The artifact must be regenerated from this exact tree; parity assertions must not be weakened.

The source evidence to preserve is the CORE-081/085 source suite (26/26) and core suite (303/303). The implementation is artifact-only: no source, GUI, governing-document, or board changes belong in this ticket.

## Build and check path

The repository's plugin build produces the committed standalone plugin artifact from the mcp-server build. The authoritative checks are the generated-artifact parity rail (plugin:check), MCPB parity rail (mcpb:check), and the hosted verify/kanmer-gate run on the PR. Local mcpb CLI availability is an environment boundary already recorded by CORE-081; if unavailable, preserve the exact failure as INCONCLUSIVE rather than adding a dependency or weakening the check.

## Risks and constraints

Only plugins/kanmer/mcp/kanmer-mcp.cjs should differ from the exact fcd99855 base. A generated one-line/bundled artifact is expected. The PR must retain the ticket footer and target the CORE-026 cumulative branch so CORE-081 can be freshly reviewed after this remediation.
