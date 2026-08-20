# Research — MCP-028 end-to-end remote-access integration evidence

## Purpose

Unit, fake-provider, loopback, GUI, and doctor tests prove component behavior but cannot prove that the complete public chain works:

```text
remote MCP client
→ public DNS and trusted TLS
→ named tunnel/provider edge
→ cloudflared connector
→ authenticated loopback Streamable HTTP
→ expected Kanmer project/tool registry/store
```

This ticket supplies that final acceptance without making normal pull-request CI depend on long-lived provider credentials or a public service.

## Controlled environment

Use a dedicated, pre-provisioned remote-integration environment:

- disposable Kanmer project/board created for the run;
- dedicated named tunnel and test hostname, not a production endpoint;
- protected Cloudflare credential reference held outside the repository;
- ephemeral 256-bit Kanmer bearer generated for the run;
- current reviewed Kanmer build/artifact;
- one server/connector owner at a time enforced by a concurrency lock;
- default-deny cleanup that stops processes and removes local secret/config/project fixtures;
- provider resources retained or revoked according to environment ownership, never deleted automatically by test code unless explicitly designed as disposable.

The public hostname may be stable test infrastructure, but evidence should show a safe label/fingerprint rather than publishing unnecessary endpoint/account details. Never attach bearer, provider credentials, credential JSON, full session id, raw environment, complete process command line with secrets, or unredacted provider logs to the ticket/PR/artifacts.

## Execution forms

Required repeatable form:

- a repository script/library that performs the exact acceptance matrix and emits schema-versioned sanitized JSON plus a Markdown proof summary;
- an operator-run command using protected file/environment references and explicit test hostname;
- optionally a manually approved protected GitHub Actions `workflow_dispatch` environment with secret access, no PR/fork trigger, one concurrency group, least permissions, and sanitized artifacts.

A manual workflow is useful only if repository/environment owners can provision secrets and prevent concurrent connectors. The local/manual script remains canonical and must not depend on GitHub.

## Acceptance matrix

### A. Build and local regressions

- root verification is green for the exact commit under test;
- stdio source/built/plugin discovery and a safe read remain unchanged;
- isolated plugin check passes when relevant;
- remote config/local doctor passes before public exposure.

### B. Public route and security

- public hostname resolves and TLS hostname/certificate validation succeeds with standard trust;
- no redirect/login/intermediary page;
- missing bearer returns exact generic 401/challenge before MCP parsing;
- independently generated wrong bearer returns the same result;
- query/cookie token does not authenticate;
- valid bearer initializes with official MCP Streamable HTTP client;
- public doctor required checks pass.

### C. Project and tool contract

- orientation/status returns the full expected disposable project fingerprint;
- public tool discovery equals the canonical `remote-http-v1` set;
- background dispatch tool ids are absent and an attempted call is unknown/unavailable before any handler work;
- no request parameter/URL can select a second project;
- a wrong `expected_project` write fails with the canonical structured error and causes no mutation;
- one controlled correct remote mutation against a prepared disposable ticket/document succeeds with the correct project/version, is read back, and is then cleaned/retained as test evidence according to fixture policy;
- a deliberately gate-blocked move/write remains blocked remotely exactly as locally.

The mutation proves remote board authority is functional while the negative checks prove the bearer does not bypass project/version/stage/document gates.

### D. Session lifecycle

- initialize/session creation and subsequent requests work through the public endpoint;
- session cannot be used without/wrong token;
- clean client close/DELETE removes it;
- process restart invalidates the old session and a new initialize succeeds;
- concurrent bounded client requests obey limits without corrupting the board.

### E. Rotation and revocation

- rotate to a newly persisted ephemeral bearer through the shipped GUI/headless mechanism;
- old bearer and old session fail immediately;
- new bearer requires and completes fresh initialization;
- public doctor passes for the new auth generation;
- revoke/stop closes sessions and public MCP becomes unavailable/unauthenticated according to stop state;
- no dual-token grace behavior occurs.

### F. Tunnel degradation and recovery

- intentionally terminate only the owned cloudflared child;
- observe connected→degraded/restarting with bounded attempt metadata;
- prove no unrelated process is killed and local authenticated HTTP remains healthy;
- observe reconnection or terminal exhaustion according to the configured test policy;
- after recovery, rerun public doctor and confirm expected project/tool/auth generation;
- intentional stop suppresses restart and leaves no owned child/runtime config/metrics resource.

### G. GUI and multi-project evidence

The real public endpoint may cover one project. GUI-095's tested fake/local integration must additionally prove multiple registered projects, bounded auto-start, unique hostname/tunnel identity, isolated failure, renderer reload, rotation, and true-app-quit cleanup. The final report links those exact test results. A second real public tunnel is optional and must not block acceptance unless the FRD explicitly requires it.

### H. Remote-client separation

At least one public MCP client invocation must occur through the public hostname using the official SDK client in a separate process. Where practical, run it from a host/network distinct from the origin to prove remote routing. If a protected manual workflow runs client and origin on one runner, state that limitation honestly; DNS/TLS/provider routing still must be public, not a local hosts override.

## Evidence format

Emit a sanitized result such as:

```json
{
  "kind": "kanmer-remote-integration",
  "schema": 1,
  "commit": "<full-sha>",
  "platform": "...",
  "versions": {"kanmer":"...","node":"...","cloudflared":"..."},
  "projectFingerprint": "...",
  "endpointFingerprint": "sha256:...",
  "startedAt": "...",
  "durationMs": 0,
  "checks": [{"id":"PUBLIC_DOCTOR","status":"pass","evidence":{}}],
  "cleanup": {"status":"pass"},
  "secretScan": {"status":"pass"},
  "overall": "pass"
}
```

Use endpoint fingerprint or safely masked hostname rather than secret URL where policy requires. Evidence entries contain command/check ids, safe expected/observed values, timestamps/durations, and references to generated disposable fixture ids—not raw command output.

The Markdown proof summarizes:

- exact commit/artifact/platform/version;
- environment ownership and limitations;
- every acceptance result;
- safe doctor report excerpt/check counts;
- controlled mutation id and before/after hash, not document secret content;
- rotation/restart/degradation/cleanup traces;
- canary-secret scan surfaces;
- deferred/non-applicable cases and reason.

## Secret-leak canary

Seed unique canaries for:

- Kanmer bearer;
- provider credential/token content (only inside protected fixture source);
- session id;
- disposable document phrase;
- local secret/config path.

Scan:

- process argv/environment snapshot available to harness;
- stdout/stderr/structured events/status;
- doctor JSON/human output;
- GUI/main/renderer logs and diagnostic export where exercised;
- generated JSON/Markdown/JUnit/artifacts;
- runtime config (allow credential **path** only where required, never content/bearer);
- Git diff/status and ticket/PR text.

The controlled disposable document phrase may appear in its board fixture/read response during the test, but not in logs/evidence unless a hashed identifier is intentionally recorded. The final proof must contain no canary.

## Cleanup requirements

Cleanup runs in `finally` and again as an idempotent post-check:

- close MCP clients/sessions;
- stop tunnel then HTTP host;
- kill only owned remaining process tree after grace timeout;
- clear restart timers/metrics sockets;
- remove runtime config, token file, temporary provider credential copy, disposable board/worktrees, and generated client config;
- clear one-time GUI delivery/clipboard fixture when used;
- verify public doctor/connection no longer succeeds after intentional stop where the provider route semantics permit;
- inspect process table, open ports, temp directories, Git status, and board source for residue;
- revoke/rotate provider-side test credential only if environment policy owns that lifecycle.

A failed cleanup makes the overall integration fail even if functional checks passed.

## Failure classification

- product failure: reproducible Kanmer transport/auth/tunnel/GUI/doctor/tool/gate behavior mismatch;
- environment failure: provider outage, DNS propagation, expired external credential, unavailable protected runner/host;
- test-harness failure: invalid fixture, leaked secret, ambiguous assertion, cleanup defect.

Report the class with evidence. Do not retry deterministic product/security failures. A bounded retry is allowed only for an identified transient provider connection event and must be recorded.

## Non-goals

- No production board, endpoint, account automation, provider-resource deletion by default, OAuth, Quick Tunnel, remote dispatch, multi-board endpoint, insecure TLS, performance/load benchmark, or always-on service certification.
