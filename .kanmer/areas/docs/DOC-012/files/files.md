# Files — DOC-012

## Add

| Path | Exact responsibility |
|---|---|
| `docs/functional/frd/FRD-025-remote-access.md` | Normative product requirements for explicit remote mode: shared tool registry; stdio compatibility; one project per process; Streamable HTTP endpoint/lifecycle; mandatory bearer auth; loopback bind; origin/host checks; remote tool exposure policy excluding background dispatch; session/resource limits; tunnel abstraction; GUI/doctor/manual outcomes; observability; security and acceptance matrix; explicit non-goals. |
| `docs/architecture/adr/ADR-0017-streamable-http-remote-access.md` | Decision record selecting MCP Streamable HTTP around the existing server, in-memory stateful sessions, bearer token as first-release application auth, loopback origin behind interchangeable tunnel adapter, cloudflared first, one-board process scope, and no OAuth/multi-board/remote dispatch. Include alternatives and consequences. |

Use these sequence numbers only after confirming the repository's canonical indexes show FRD-024 and ADR-0016 as the current highest accepted numbers. If another accepted document already occupies either number, use the next available number and update every ticket/reference consistently before implementation; do not create duplicate-number files.

## Modify

| Path | Exact responsibility |
|---|---|
| `docs/functional/frd/README.md` | Add FRD-025 to the canonical FRD index/order with status and concise description, if this index exists. |
| `docs/architecture/adr/README.md` | Add ADR-0017 to the canonical ADR index/order/status, if this index exists. |
| `docs/README.md` | Add remote-access documents to the main documentation map only if this is the canonical cross-index. |
| `README.md` | Do not add setup instructions here (DOC-013 owns the manual). Add only a brief future/current capability pointer if the repository's documentation policy requires every shipped FRD/ADR to be linked from README. |
| `.kanmer/groups/EPIC-010/context.md` | Inspect as governing source. Modify only if implementation uncovers an approved clarification; do not rewrite scope from this ticket. |

## Inspect / cross-reference

| Path | Reason |
|---|---|
| `docs/functional/frd/FRD-012-*.md` | Existing provider/plugin/connect architecture and settings ownership; use the actual matching filename. |
| `docs/functional/frd/FRD-019-*.md` | GUI design/system behavior relevant to remote controls; use actual filename. |
| `docs/functional/frd/FRD-020-*.md` | Existing connector/transport behavior if present. |
| `docs/functional/frd/FRD-021-*.md` | Release/update/diagnostic behavior if referenced by GUI-095. |
| `docs/functional/frd/FRD-022-mcp-server-surface.md` | Canonical MCP server/tool/error/root behavior and stdio compatibility. |
| `docs/functional/frd/FRD-023-agent-skills-system.md` | Background dispatch boundary; remote HTTP must exclude MCP-020 dispatch. |
| `docs/architecture/adr/ADR-0009-*.md` | Provider Connect/managed block architecture used by GUI settings. |
| `docs/architecture/adr/ADR-0015-*.md` | Repository staleness/health conventions if surfaced remotely. |
| `docs/architecture/adr/ADR-0016-compiled-workflow.md` | Expected-project, gates, packet, SHA record, and board-worktree constraints. |
| `packages/mcp-server/src/index.ts` | Current shared tool registry/stdio composition; documents must name real boundaries and avoid fictional modules. |
| `packages/mcp-server/package.json` | Current MCP SDK/version and package/runtime ownership. |
| `apps/gui/src/` settings/process-management modules | Existing settings/child-process/secret patterns to make FRD implementation-feasible. |
| `scripts/release.mjs` and packaging config | Confirm whether cloudflared is bundled, downloaded, or separately required; FRD must not promise an unapproved distribution method. |
| MCP official specification and TypeScript SDK docs | Pin terminology and method/header/session behavior to the implementation's supported spec/SDK version. |
| Cloudflare Tunnel official docs | Pin loopback origin, tunnel process, credential, and hostname terminology. |

## Required FRD sections

- Summary and user problem.
- Actors and trust boundaries.
- Scope/non-goals.
- Existing stdio compatibility.
- One-project process model.
- Transport endpoint/method/session requirements.
- Authentication/secret lifecycle.
- Origin/host/bind requirements.
- Remote tool exposure policy.
- Tunnel adapter contract and cloudflared-first behavior.
- GUI/CLI/doctor/manual requirements.
- Lifecycle, shutdown, restart, degraded states.
- Structured redacted logging and diagnostics.
- Configuration schema/precedence.
- Security/privacy/availability requirements.
- Acceptance scenarios and traceability to MCP-021/025/026/027/028, GUI-095, DOC-013.
- Deferred work.

## Required ADR sections

- Status/date/owners.
- Context and forces.
- Decision.
- Component/process/data-flow diagram.
- Transport/session/auth/tunnel/project decisions.
- Alternatives: stdio-only, SSE legacy transport, WebSocket, custom REST, OAuth first, direct LAN bind, vendor-specific tunnel, multi-board router.
- Positive/negative consequences.
- Security implications.
- Compatibility/migration/rollback.
- Follow-up tickets and supersession rules.

## Do not modify

- Implement code, manifests, tool schemas, provider registration, or GUI in a documentation ticket.
- Promise OAuth, multi-board routing, remote dispatch, browser CORS, WebSocket, persistent sessions, or hosted relay.
- Change existing stdio behavior.
- Store actual tokens/hostnames in docs.
- Add user setup steps that DOC-013 owns beyond normative requirements.
- Guess occupied FRD/ADR numbers without checking indexes.
