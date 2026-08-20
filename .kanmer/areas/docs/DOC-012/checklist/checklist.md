# Checklist — DOC-012

## Numbering and sources

- [ ] Confirm FRD-025 and ADR-0017 are free in canonical indexes.
- [ ] If occupied, allocate next free numbers and update ticket refs first.
- [ ] Read EPIC-010 context and all predecessor FRDs/ADRs.
- [ ] Inspect current MCP server, SDK version, GUI settings/process, and packaging boundaries.
- [ ] Re-check official MCP transport/authorization/security sources.
- [ ] Re-check official cloudflared terminology.
- [ ] Record source/version/date in docs.

## FRD scope

- [ ] Define user problem and actors/trust boundaries.
- [ ] Preserve opt-in remote mode and default stdio.
- [ ] Bind one project fingerprint per process/endpoint.
- [ ] Prohibit request-selected repositories/boards.
- [ ] State every explicit non-goal.

## Transport

- [ ] Specify `POST|GET|DELETE /mcp`.
- [ ] Require official SDK framing/transport.
- [ ] Define initialization/version/method/path responses.
- [ ] Select in-memory stateful sessions.
- [ ] Require cryptographic session ids/token binding/TTL/caps/cleanup.
- [ ] Define request/body/header/connection/time limits.
- [ ] Define bounded shutdown.
- [ ] Define optional loopback-only health behavior if retained.
- [ ] Require structured redacted ready status.
- [ ] Require loopback bind and reject implicit wildcard.

## Authentication and origin security

- [ ] Require bearer before parsing/session creation on all methods.
- [ ] Require 32+ random bytes and constant-time comparison.
- [ ] Prohibit query/cookie/CLI/log token.
- [ ] Define protected secret storage/reference/export behavior.
- [ ] Define rotation and session invalidation.
- [ ] Define explicit Origin allowlist.
- [ ] Prohibit wildcard CORS/browser promise.
- [ ] Define trusted forwarded-header boundary.
- [ ] State tunnel access controls do not replace bearer.

## Tool/project policy

- [ ] Reuse canonical registry/results/errors.
- [ ] Preserve stage/doc/questions/expected-project gates.
- [ ] Define one remote exposure policy.
- [ ] Exclude background dispatch remotely.
- [ ] Require local discovery unchanged.
- [ ] Require project fingerprint orientation/doctor checks.
- [ ] Require restart for project switch.

## Tunnel/lifecycle

- [ ] Define adapter validate/start/status/stop/logs.
- [ ] Define generic inputs and normalized states.
- [ ] Require safe spawn/version/env/redaction/PID/log/shutdown behavior.
- [ ] Specify cloudflared first without generic-interface leakage.
- [ ] Start local listener/health before tunnel.
- [ ] Define degraded/restart/stop/orphan behavior.
- [ ] Leave unapproved executable distribution undecided.

## GUI, doctor, logging, manual

- [ ] Define GUI-095 responsibilities.
- [ ] Define secret reveal/rotation/project-switch safety.
- [ ] Define MCP-027 doctor matrix.
- [ ] Define DOC-013 required sections/provider-neutral language.
- [ ] Define structured local logs/redaction/retention/export.
- [ ] Distinguish board/listener/auth/session/tunnel/handshake health.

## Acceptance and ADR

- [ ] Add stable requirement ids.
- [ ] Map every requirement to implementation/verification ticket.
- [ ] Include full positive/negative/security/lifecycle scenarios.
- [ ] Make MCP-028 final integration owner.
- [ ] Write ADR context/decision/diagrams.
- [ ] Record all selected component decisions.
- [ ] Compare/reject listed alternatives.
- [ ] Record positive/negative consequences.
- [ ] Define migration/rollback/supersession.

## Validation

- [ ] Add docs to canonical indexes/maps.
- [ ] Link actual paths to EPIC/tickets after creation.
- [ ] Search and resolve conflicting promises within scope.
- [ ] Run doc/link/Markdown/Mermaid validation.
- [ ] Run root verify where applicable.
- [ ] Confirm no token/real hostname/implementation code is present.
- [ ] Run `git diff --check`.
- [ ] Record traceability counts/results in post-implementation report.
- [ ] Stop before merge.
