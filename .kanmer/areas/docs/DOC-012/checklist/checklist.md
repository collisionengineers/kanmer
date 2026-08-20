# Checklist — DOC-012

## Numbering and sources

- [x] Confirm FRD-025 and ADR-0017 are free in canonical indexes.
- [x] If occupied, allocate next free numbers and update ticket refs first.
- [x] Read EPIC-010 context and all predecessor FRDs/ADRs.
- [x] Inspect current MCP server, SDK version, GUI settings/process, and packaging boundaries.
- [x] Re-check official MCP transport/authorization/security sources.
- [x] Re-check official cloudflared terminology.
- [x] Record source/version/date in docs.

## FRD scope

- [x] Define user problem and actors/trust boundaries.
- [x] Preserve opt-in remote mode and default stdio.
- [x] Bind one project fingerprint per process/endpoint.
- [x] Prohibit request-selected repositories/boards.
- [x] State every explicit non-goal.

## Transport

- [x] Specify `POST|GET|DELETE /mcp`.
- [x] Require official SDK framing/transport.
- [x] Define initialization/version/method/path responses.
- [x] Select in-memory stateful sessions.
- [x] Require cryptographic session ids/token binding/TTL/caps/cleanup.
- [x] Define request/body/header/connection/time limits.
- [x] Define bounded shutdown.
- [x] Define optional loopback-only health behavior if retained.
- [x] Require structured redacted ready status.
- [x] Require loopback bind and reject implicit wildcard.

## Authentication and origin security

- [x] Require bearer before parsing/session creation on all methods.
- [x] Require 32+ random bytes and constant-time comparison.
- [x] Prohibit query/cookie/CLI/log token.
- [x] Define protected secret storage/reference/export behavior.
- [x] Define rotation and session invalidation.
- [x] Define explicit Origin allowlist.
- [x] Prohibit wildcard CORS/browser promise.
- [x] Define trusted forwarded-header boundary.
- [x] State tunnel access controls do not replace bearer.

## Tool/project policy

- [x] Reuse canonical registry/results/errors.
- [x] Preserve stage/doc/questions/expected-project gates.
- [x] Define one remote exposure policy.
- [x] Exclude background dispatch remotely.
- [x] Require local discovery unchanged.
- [x] Require project fingerprint orientation/doctor checks.
- [x] Require restart for project switch.

## Tunnel/lifecycle

- [x] Define adapter validate/start/status/stop/logs.
- [x] Define generic inputs and normalized states.
- [x] Require safe spawn/version/env/redaction/PID/log/shutdown behavior.
- [x] Specify cloudflared first without generic-interface leakage.
- [x] Start local listener/health before tunnel.
- [x] Define degraded/restart/stop/orphan behavior.
- [x] Leave unapproved executable distribution undecided.

## GUI, doctor, logging, manual

- [x] Define GUI-095 responsibilities.
- [x] Define secret reveal/rotation/project-switch safety.
- [x] Define MCP-027 doctor matrix.
- [x] Define DOC-013 required sections/provider-neutral language.
- [x] Define structured local logs/redaction/retention/export.
- [x] Distinguish board/listener/auth/session/tunnel/handshake health.

## Acceptance and ADR

- [x] Add stable requirement ids.
- [x] Map every requirement to implementation/verification ticket.
- [x] Include full positive/negative/security/lifecycle scenarios.
- [x] Make MCP-028 final integration owner.
- [x] Write ADR context/decision/diagrams.
- [x] Record all selected component decisions.
- [x] Compare/reject listed alternatives.
- [x] Record positive/negative consequences.
- [x] Define migration/rollback/supersession.

## Validation

- [x] Add docs to canonical indexes/maps.
- [ ] Link actual paths to EPIC/tickets after creation.
- [x] Search and resolve conflicting promises within scope.
- [x] Run doc/link/Markdown/Mermaid validation.
- [x] Run root verify where applicable.
- [x] Confirm no token/real hostname/implementation code is present.
- [x] Run `git diff --check`.
- [x] Record traceability counts/results in post-implementation report.
- [x] Stop before merge.

## Progress notes

- 2026-08-20: FRD-025 and ADR-0017 were allocated after confirming FRD-024 and ADR-0016 are the highest existing numbers. Sources recorded from the MCP Streamable HTTP specification/TypeScript SDK and Cloudflare Tunnel documentation, each rechecked on this date.
- Validated document numbering, local Markdown links, secret-literal scan, manual artifact, script tests, skill prose, and `git diff --check`. Root typecheck still stops only at pre-existing `packages/ui/src/demo.tsx` missing `TicketDocsInfo.documentPaths`; core, MCP server, and GUI complete their checks.
- `link_doc` cannot resolve this branch's new docs from the MCP server's main-checkout repo root before merge. Per DOC-012-only scope, dependent tickets are not mutated; their owners must link the merged paths when they begin implementation.

- 2026-08-20: Opened PR #84 (https://github.com/collisionengineers/kanmer/pull/84), recorded commit `43160fc4dbbcd85554ee7c2bc877c66f40af9333` and PR traceability, and stopped before merge. The one remaining checkbox is intentionally post-merge: the MCP board validates `refs` against its main checkout and cannot link branch-only files; dependent ticket owners will link the merged docs.
