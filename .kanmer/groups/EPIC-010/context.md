# Remote access — approval contract

## Outcome
any remote MCP client can reach a local Kanmer board through one Streamable HTTP endpoint with token auth, via interchangeable tunnel adapters; health is diagnosable in one command.

## In scope
FRD/ADR, transport, auth, adapter contract + cloudflared, doctor, GUI lifecycle (GUI-095), ChatGPT-tunnel docs as one adapter manual (DOC-010).

## Out of scope
MCP-020 dispatch-over-MCP (separate authz boundary), OAuth (deferred), multi-board single endpoints.

## Risks
secrets handling (no plaintext), localhost-bind default, per-project isolation.

## Done when
integration ticket proves a real remote client on a second machine.
