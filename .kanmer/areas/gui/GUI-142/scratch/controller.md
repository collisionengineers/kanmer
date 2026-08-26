## Controller stop — bounded remediation budget exhausted

PR #281 exact head `328d80bf04eb98aa362da649e6ddb1c8ed933824` has green required checks (`verify`, `kanmer-gate`). The one post-replan independent review fixed F-015 but returned `needs-changes` for F-016: an unrelated `[[hooks]]` array-of-tables after the Kanmer registration is reproducibly treated as descriptor drift, violating the plan's unrelated-table isolation acceptance. Review attestation version: `8d5e043e683df935`.

Under the approved review budget (consolidated review, remediation/delta, one fresh replan/re-execute, final review), no further automatic remediation is authorized. Ticket remains taken in Review as a live resume target; PR is not merged; v0.3.12 and candidate work remain gated.

## Operator disposition — PR #281 current-head P2 findings

Expected head: `328d80bf04eb98aa362da649e6ddb1c8ed933824`
Follow-up: [[CORE-112]] — Replace hand-written Codex registration TOML scanner with semantic TOML parsing.

### F-016 / GitHub thread PRRT_kwDOT2PEds6ckRi8 — minor, deferred-to-ticket

Complete finding:

> Recognize array-of-table boundaries
>
> When a valid Codex config places an unrelated TOML array-of-tables such as `[[hooks]]` after `[mcp_servers.kanmer]`, this header regex does not recognize it because the capture excludes brackets. The array table therefore remains in the Kanmer section, `isTomlTrivia` rejects the leftover content, and every Windows `get_status` incorrectly reports the canonical registration as behind. Treat `[[...]]` as a section boundary while keeping unrelated tables outside the descriptor comparison.

Disposition: `deferred-to-ticket` → [[CORE-112]].
Reason: explicit operator authorization classifies this as a non-blocking P2 false-staleness risk for manually formatted but semantically equivalent TOML; GUI-142's core launcher/Connect/MCP acceptance remains satisfied.

### F-017 / GitHub thread PRRT_kwDOT2PEds6ckRjH — minor, deferred-to-ticket

Complete finding:

> Accept equivalent encodings of the permitted environment
>
> When the sole allowed environment entry is written as valid TOML inline data, for example `env = { KANMER_BOARD_BRANCH = "custom-board" }`, or as the equivalent dotted assignment, Codex receives the same canonical descriptor required by FRD-012. This remainder check nevertheless returns false before the environment validator runs, so every Windows `get_status` reports a healthy registration as behind. Parse the environment value semantically and validate its keys instead of requiring only the generated child-table spelling.

Disposition: `deferred-to-ticket` → [[CORE-112]].
Reason: explicit operator authorization classifies this as the same non-blocking P2 semantic-parser class. CORE-112 must use existing `smol-toml` and cover every required encoding and rejection case in one implementation.

Residual risk retained for GUI-142: manually formatted, semantically equivalent TOML can receive a false reconnect/staleness warning until CORE-112 lands. It does not invalidate the generated portable registration, argv launch, probe failure propagation, MCP handshake, reconnect migration, or exact-head required checks.
