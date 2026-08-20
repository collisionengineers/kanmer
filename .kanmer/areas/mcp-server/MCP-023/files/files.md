# Files — MCP-023

## Add

| Path | Required change |
|---|---|
| `packages/mcp-server/src/execution-packet.ts` | Pure/composite packet builder: fixed refusal order, ticket/group/doc assembly, ATX section extraction, stop/commands fallbacks, and response types. It receives store/project/actor dependencies; it performs no writes. |

## Modify

| Path | Required change |
|---|---|
| `packages/core/src/store.ts` | Add reusable read helpers for enumerating a format-3 ticket’s Markdown document paths with content-version tokens and for batch-reading selected paths. Return `null`/legacy signal without exposing private item locations. MCP-019 must reuse these helpers. |
| `packages/core/src/types.ts` | Add exported result types for ticket document descriptors/batch reads if they are part of the public store API. |
| `packages/core/src/store.test.ts` | Test recursive, sorted path enumeration; index-path normalization; independent versions; missing docs; legacy/null behaviour; no writes. |
| `packages/mcp-server/src/index.ts` | Register `get_execution_packet` as read-only; pass MCP-022 project identity and current actor to the packet builder; update tool count/comments where explicit. No write wrapper. |
| `packages/mcp-server/src/smoke.mjs` | Add ready/refusal matrix, response-shape assertions, section parsing/fallback, group contexts, versions, extras, same/other actor occupancy, and fresh-root no-write proof. |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | Add one read-tool row immediately above `## Field semantics`; document ready/refusal shapes and field semantics once. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Regenerate from the normal main checkout. |

## Reuse from dependencies

| Path | Why |
|---|---|
| `packages/mcp-server/src/project-identity.ts` | MCP-022 project block/fingerprint; do not recalculate differently. |
| `packages/mcp-server/src/errors.ts` | Shared `GATE_BLOCKED` vocabulary. Packet refusal is normal data, not `isError`, but uses the same literal/type. |
| `packages/core/src/gates.ts` | Full `GateReport` and resolved profile/boundary requirements. Do not restate profiles. |
| `packages/core/src/docpaths.ts` | Recursive containment/path normalization. Extend/reuse; do not walk ticket folders ad hoc in MCP. |
| `packages/mcp-server/src/index.ts` `actorName()` | Same client identity used by `take_ticket`; expose/pass it rather than inventing occupancy identity. |
| `packages/mcp-server/src/index.ts` `get_ticket_doc` | MCP-019 will extend it to batch reads. Both handlers must share the new store helper. |
| `MASTERPLAN.md` S-06 / Appendix A | Exact packet fields, refusal precedence, chore/spike semantics, fallback. |
| `docs/functional/frd/FRD-010-task-scoped-dispatch.md` | DOC-011 will add dispatch/packet equivalence; inspect for terminology. |
| `docs/functional/frd/FRD-022-mcp-server-surface.md` | Governing MCP delta to be linked by DOC-011. |

## Exact response fields

Ready:

```text
ready, project, ticket, groupContexts, documents {plan, checklist, files},
extraDocs, gates, stopCondition, commandsHint
```

Refused:

```text
ready:false, code:GATE_BLOCKED, reason, missing, project, ticket?, gates?
```

## Ripple effects

- SKILL-021 makes this its first data call and stops on `ready:false`.
- CORE-035 uses every refusal path and happy path.
- MCP-019 either lands before and supplies the batch helper, or lands after and consumes the helper added here. No duplicate multi-doc implementation is permitted.
- Tool count rises by one and plugin/reference bytes must move together.

## Do not modify

- `take_ticket`, worktree creation, stage movement, activity logs, or any ticket files during the read.
- Profile tables/gates or require all three index documents.
- Produce model-generated summaries/truncation of group context.
- Return document contents for every extra document.
- Treat packet refusal as an `isError` result.
- Add a second public document-fetch tool or separate store traversal API.
