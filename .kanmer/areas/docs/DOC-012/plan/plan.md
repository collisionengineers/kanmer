# Plan — DOC-012: remote-access FRD and Streamable HTTP ADR

## Objective

Create the governing product and architecture documents for secure provider-neutral remote Kanmer access before implementation begins. The documents must make stdio compatibility, one-board scope, Streamable HTTP, bearer authentication, loopback/tunnel boundaries, remote tool policy, lifecycle, security, diagnostics, and explicit non-goals mechanically traceable to EPIC-010 tickets.

## Starting state

- EPIC-010 approves Streamable HTTP plus bearer auth plus interchangeable tunnel adapters, with `cloudflared` first.
- Existing MCP server is stdio-based and owns the canonical tool registry.
- MCP-021/025/026/027/028, GUI-095, and DOC-013 depend on an unambiguous contract.
- OAuth, multi-board HTTP routing, and background dispatch over remote MCP are out of scope.

## Required changes

### 1. Validate document numbering and repository reality

1. Read FRD/ADR indexes and highest accepted numbers.
2. Confirm proposed paths `FRD-025-remote-access.md` and `ADR-0017-streamable-http-remote-access.md` are free.
3. If occupied, allocate the next free sequential numbers and update this ticket's refs before implementation.
4. Read EPIC-010 context and every linked predecessor FRD/ADR named in `files.md`.
5. Read current MCP server composition/package SDK version, GUI settings/process patterns, and packaging strategy so documents name real boundaries.
6. Re-check the official MCP transport/authorization/security text for the SDK/spec version implementation will support.
7. Re-check official cloudflared lifecycle/config terms.
8. Record source titles/version/date in the FRD references section without copying large passages.

### 2. Write FRD problem, scope, and actors

9. State the user problem: securely reach one local Kanmer board from remote MCP clients without changing existing stdio consumers.
10. Define actors: local operator, remote client, Kanmer HTTP host, tunnel adapter/provider, GUI, board/store.
11. Define trust boundaries and protected assets.
12. State first-release scope and all explicit non-goals.
13. State that remote mode is opt-in and stdio remains default/compatible.
14. State that each process/endpoint is permanently bound to one resolved project fingerprint for its lifetime.
15. Prohibit repository/board selection from request URL/body.

### 3. Specify transport requirements

16. Define canonical `/mcp` path and accepted POST/GET/DELETE methods.
17. Require official SDK transport/framing rather than custom JSON-RPC/SSE.
18. Define protocol initialization/version behavior and unsupported method/path responses.
19. Select in-memory stateful sessions.
20. Require cryptographic server-generated session ids, token binding, TTL, count cap, cleanup, and restart invalidation.
21. Define request/header/body/connection/time limits and shutdown behavior.
22. Define optional loopback-only health endpoint constraints if included.
23. Require structured ready/status output without secrets.
24. Require listener bind to loopback and refusal of implicit wildcard bind.

### 4. Specify authentication and origin security

25. Require bearer auth on POST/GET/DELETE before body parsing/session creation.
26. Require at least 32 random bytes, URL-safe encoding, constant-time comparison, and fingerprint-only logs.
27. Prohibit query/cookie/command-line/log token handling.
28. Specify OS credential-store/protected secret reference expectations and config export redaction.
29. Define rotation: replace secret, invalidate sessions, reconnect, audit event, remove old reference.
30. Require explicit origin allowlist and rejection of non-allowlisted present origins.
31. Prohibit wildcard CORS/browser promise.
32. Define trusted forwarded-header boundary through configured tunnel only.
33. State tunnel/provider access control is optional defence in depth, never a bearer replacement.

### 5. Specify tool and project policy

34. Require reuse of the canonical tool registry/result/error contracts.
35. Require existing stage/doc/questions/expected-project safety checks on writes.
36. Define one explicit remote exposure policy.
37. Exclude background dispatch tools/capabilities from remote discovery and calls.
38. Require tests proving local stdio discovery remains unchanged and remote discovery differs only by approved exclusion.
39. Require orientation/project fingerprint exposure and connector-doctor validation.
40. Require remote listener restart rather than hot-switching projects.

### 6. Specify tunnel adapter and lifecycle

41. Define provider-neutral adapter operations: validate/doctor, start, status, stop, logs/events.
42. Define adapter inputs: loopback origin, provider config/secret references, requested hostname/mode.
43. Define normalized states: stopped, starting, connected, degraded, failed, stopping.
44. Require argument-array spawning, executable/version validation, environment allowlist, redaction, PID ownership, bounded logs, graceful/forced shutdown.
45. Define `cloudflared` as first adapter without making provider-specific fields part of the generic interface.
46. Define local-first startup: validate board/auth, bind/listener health, then tunnel.
47. Define tunnel failure behavior: local server may remain, status degrades, bounded restart/backoff belongs to adapter/GUI.
48. Define stop order and orphan prevention.
49. Defer executable distribution/download decision to implementation research unless current packaging already mandates it.

### 7. Specify GUI, doctor, manual, and observability outcomes

50. Define GUI-095 settings/status/start-stop/rotate/copy endpoint/redacted diagnostics responsibilities.
51. Require confirmation/safe display around secret creation/rotation and project switch.
52. Define MCP-027 doctor checks: executable, config, local bind, auth negative/positive, initialize, project fingerprint, remote tool policy, tunnel reachability where requested.
53. Define DOC-013 manual sections and provider-neutral language.
54. Define structured local logs/events and strict redaction fields.
55. Define bounded retention and diagnostic export without secrets/content.
56. Define health dimensions separately: board, listener, auth, session capacity, tunnel, remote handshake.

### 8. Write acceptance and traceability matrix

57. Add requirement ids grouped as RA-TRANSPORT, RA-AUTH, RA-PROJECT, RA-TOOLS, RA-TUNNEL, RA-GUI, RA-DOCTOR, RA-SEC, RA-COMPAT.
58. For every requirement, identify implementing ticket and verification owner.
59. Include positive local/remote connect scenario.
60. Include no/wrong token, disallowed origin, wildcard bind, wrong project, expired/cross-token session, oversized input, excluded dispatch, rotation, tunnel death/restart, project switch, shutdown, and stdio-regression scenarios.
61. Make MCP-028 own the final cross-component proof rather than duplicating implementation in docs.
62. Define evidence expected in post-implementation report/proof.

### 9. Write ADR

63. State context/forces and selected architecture succinctly.
64. Include component and sequence diagrams in Mermaid or repository-standard text format.
65. Record decisions: shared registry, Streamable HTTP, stateful in-memory sessions, bearer first, loopback, provider-neutral adapter, cloudflared first, one board/process, dispatch excluded.
66. Compare and reject legacy SSE, WebSocket, custom REST, direct LAN bind, OAuth-first, vendor-coupled tunnel, multi-board router, hosted relay.
67. Record positive consequences: protocol compliance, compatibility, limited blast radius, replaceable tunnel.
68. Record negative consequences: possession credential, tunnel trust, per-board process, in-memory session loss, operational child-process burden.
69. Define migration/rollback: feature off restores stdio-only; stopping listener/tunnel leaves board data untouched.
70. Link follow-up tickets and criteria for supersession.

### 10. Index, validate, and link

71. Add both docs to canonical indexes/cross-map in correct order/status.
72. Run Markdown/link/doc validators and inspect Mermaid rendering where applicable.
73. Search repository for conflicting remote-access terms/promises and resolve only within this ticket's approved docs/links.
74. Link actual document paths to EPIC-010 and dependent tickets after files exist.
75. Ensure no implementation/user-secret values are present.
76. Run `git diff --check`.
77. Record document requirement counts and traceability completeness in post-implementation report.

## Expected files

- New remote-access FRD.
- New Streamable HTTP architecture ADR.
- Canonical FRD/ADR indexes and cross-document map where present.
- No implementation code.

## Acceptance checks

- FRD and ADR filenames/numbers are unique and indexed.
- Existing stdio is explicitly unchanged.
- `/mcp`, session, auth, loopback/origin, one-project, tool-exclusion, adapter, lifecycle, doctor, GUI, logging, and security contracts are precise.
- OAuth, multi-board, remote dispatch, browser API, WebSocket, persistent sessions, and hosted relay are explicitly out.
- Every normative requirement maps to an implementation/verification ticket.
- ADR alternatives/consequences/migration are complete.
- Official spec terminology matches the implementation's pinned SDK/spec.
- Docs validators and links pass.

## Verification commands

Use the repository's canonical document commands, including the equivalent of:

```bash
npm run verify:docs
npm run verify:skills
npm run typecheck
npm run verify
git diff --check
```

If no dedicated doc command exists, use the existing Markdown/link/reference verifier rather than inventing an uncalled script.

## Failure and deviation rules

- Stop if proposed document numbers are occupied; update ticket refs before writing.
- Stop if current SDK/spec cannot support the selected lifecycle; record an open question rather than invent custom protocol behavior.
- Do not implement code, promise unapproved executable distribution, add OAuth/multi-board/dispatch, weaken bearer/origin/loopback rules, or change stdio.
- Do not merge; hand off for independent documentation/architecture review.

## Stop condition

Stop when one indexed FRD and one indexed ADR provide an internally consistent, security-reviewed, ticket-traceable contract for one-board Streamable HTTP access behind mandatory bearer auth and an interchangeable tunnel adapter, preserve stdio, exclude deferred scope, pass documentation verification, and are ready for review.
