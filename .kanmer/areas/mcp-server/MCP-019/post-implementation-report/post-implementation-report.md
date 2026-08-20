# Post-implementation report — MCP-019

## Summary

`get_ticket_doc` now accepts either its unchanged legacy `{ id, doc }` form or a bounded `{ id, docs }` batch form. Batch reads de-duplicate first occurrence, retain request order, return independent content-version records, and use one shared core read path that future `get_execution_packet` work ([[MCP-023]]) can consume.

## Changes

| File | Change | Why |
|---|---|---|
| `packages/core/src/types.ts` | Added `TicketDocumentWithVersion`. | Exposes one typed result contract to server consumers. |
| `packages/core/src/store.ts` | Added `getDocsWithVersions`. | Resolves the ticket once, validates every path before any probe, and reads bounded requested docs without writes. |
| `packages/core/src/docs.test.ts` | Added core batch-read coverage. | Proves order, missing-document semantics, versions, duplicate handling, and atomic path validation. |
| `packages/mcp-server/src/ticket-docs.ts` | Routes the MCP helper through the shared core method. | Keeps MCP-019 and MCP-023 from growing competing document APIs. |
| `packages/mcp-server/src/index.ts` | Extended `get_ticket_doc` schema/handler and description. | Preserves single-form compatibility while exposing batch reads. |
| `packages/mcp-server/src/smoke.mjs` / `smoke-protocol.mjs` | Added batch contract and raw JSON-RPC coverage. | Covers limits, XOR, present/missing, nested, scratch, traversal, and protocol compatibility. |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | Documented the two forms and response semantics. | Keeps the agent-facing tool reference authoritative. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Rebuilt generated standalone bundle. | Ships the implementation in the plugin artifact. |

## Governing docs

The linked [FRD-022](docs/functional/frd/FRD-022-mcp-server-surface.md) remains satisfied: the tool is read-only, preserves its existing single-document response, validates through core containment rules, and exposes deterministic JSON records. No governing-document change is required for this additive compatible form.

## Risks / follow-ups

- [[MCP-023]] is still Preparing and has no source implementation. Its approved plan names this shared helper/core method as the required document-read implementation; it must consume it when that ticket begins.
- The checklist retains two explicitly deferred fixture cases (legacy-layout and injected-I/O). Runtime semantics remain compatible: legacy layout returns normal missing entries, and path validation happens before any file probe.
- Full root `npm run typecheck` fails in unrelated `@kanmer/ui` demo code because its `TicketDocsInfo` mock lacks required `documentPaths`.
- Full `npm test` passed core (254) but the GUI suite ended with two unrelated Windows `EPERM` temp-directory cleanup timeouts in `kanmerGit.test.ts`; targeted MCP/core verification is green.

## Verification hand-off

On merged `main`, run:

```bash
npm run build
node packages/mcp-server/src/smoke.mjs
npm run smoke:protocol
npm run smoke:discovery
npm run plugin:build
npm run plugin:check
git diff --check
```

Expected evidence: 175/175 MCP smoke checks, 30/30 raw-protocol checks, 13/13 discovery checks, and plugin-sync reporting 30 tools with matching bundle bytes. The author also ran the focused core document suite (49/49), core and MCP typechecks, the complete core suite (254/254), and the isolated normal-checkout plugin build/check.
