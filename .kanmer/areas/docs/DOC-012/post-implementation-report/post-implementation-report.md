# Post-implementation report — DOC-012

## Summary

DOC-012 establishes the governing contract for secure, provider-neutral remote Kanmer access before any implementation begins. It adds FRD-025’s normative requirements and ADR-0017’s architectural decision: one opt-in Streamable HTTP endpoint around the canonical registry, mandatory bearer authentication, loopback origin behind a provider-neutral tunnel adapter, cloudflared first, one board per process, and no remote dispatch. Existing stdio behavior is explicitly unchanged.

## Changes

| File | Change | Why |
|---|---|---|
| `docs/functional/frd/FRD-025-remote-access.md` | Added 29 stable requirements across compatibility, project scope, transport/session, auth/origin, tool policy, tunnel lifecycle, GUI/doctor/manual, and observability; added a ticket-traceability acceptance matrix and source record. | Gives all EPIC-010 implementation tickets one precise, security-bounded functional contract. |
| `docs/architecture/adr/ADR-0017-streamable-http-remote-access.md` | Added accepted decision, component and lifecycle Mermaid diagrams, alternatives, security implications, consequences, rollback, and follow-up ownership. | Records why Streamable HTTP, stateful sessions, bearer auth, loopback origin, adapter separation, and one-board scope were chosen. |
| `docs/README.md` | Indexed FRD-025 and ADR-0017 in the canonical documentation map. | Keeps the accepted governing-document set discoverable and numbering monotonic. |

## Governing docs

This ticket creates the governing documents rather than implementing an existing FRD. It follows the configured `docs/functional/frd/**` and `docs/architecture/adr/**` paths, the FRD granularity rule (one remote-access feature acceptance contract), and the ADR rule (one architecture decision with alternatives). It preserves FRD-022’s canonical registry/stdio boundary, FRD-023’s dispatch boundary, and ADR-0016’s expected-project/readiness constraints.

The attempted `link_doc` calls cannot resolve uncommitted branch files because the MCP server validates refs against its normal-main checkout. Under the DOC-012-only scope, dependent tickets were not mutated. After this PR merges, implementation-ticket owners must link the merged FRD/ADR paths as their governing refs.

## Risks / follow-ups

- The implementation must pin and test the exact Streamable HTTP API/spec compatible with the repository’s `@modelcontextprotocol/sdk ^1.30.0`; the published current SDK guide must not be copied blindly.
- The contract deliberately defers OAuth/OIDC, multi-board routing, browser/CORS access, WebSocket, persistent/distributed sessions, hosted relay, remote dispatch, and a promise to bundle/download `cloudflared`.
- [[MCP-021]], [[MCP-025]], [[MCP-026]], [[MCP-027]], [[GUI-095]], and [[DOC-013]] own their designated FRD rows; [[MCP-028]] owns final second-machine integrated proof.

## Verification hand-off

Review the requirements/traceability matrix, both Mermaid diagrams, source dates/links, and absence of real credential/hostname values. On the branch, the following passed:

- `node scripts/check-doc-numbering.mjs` — unique ADR/FRD/PRD numbers.
- `npm run test:scripts` — 50/50 script tests.
- `npm run check:manual` — committed manual artifact current.
- `npm run verify:skills` — all skill-prose checks pass.
- Local Markdown-link scan and credential-literal scan — pass.
- `git diff --check` and staged diff check — pass.

`npm run typecheck` still fails only in unchanged `packages/ui/src/demo.tsx` because its `getTicketDocsInfo` stub omits `TicketDocsInfo.documentPaths`; core, MCP server, and GUI typechecks complete. No runtime code changed.
