# Checklist — MCP-021

## Contract and official behavior

- [x] Read accepted FRD/ADR and actual requirement ids.
- [x] Read MCP-025/026 origin/auth/readiness/shutdown contracts.
- [x] Re-check current official named-tunnel, config, run, no-autoupdate, metrics/readiness, JSON logs, and signal docs.
- [x] Record exact tested `cloudflared --version` and `--help` syntax.
- [x] Confirm Quick Tunnel remains excluded from production.
- [x] Inspect canonical child-process/temp/app-data/log helpers.
- [x] Confirm no unapproved executable packaging promise.

## Generic adapter contract

- [x] Add provider-neutral config/start/adapter/handle/status/event/diagnostic/error types.
- [x] Use exact lifecycle states.
- [x] Include attempt/generation/project/origin metadata without secrets.
- [x] Add validated restart policy/defaults.
- [x] Use opaque credential references.
- [x] Keep Cloudflare-only fields inside its discriminator.
- [x] Ensure safe serialization excludes arbitrary child/secret data.

## Generic input validation

- [x] Require exact HTTP loopback origin and valid port.
- [x] Reject LAN/wildcard/hostname/user-info/query/fragment origin.
- [x] Require healthy auth-required local ready record and project/auth generation.
- [x] Require canonical HTTPS public hostname with no wildcard/user-info/query/fragment/unexpected path.
- [x] Normalize hostname safely.
- [x] Reject unknown provider modes/invalid restart bounds.
- [x] Return deterministic validation checks before spawn.
- [x] Test all accepted/rejected vectors.

## Executable and credentials

- [ ] Implement explicit/app-managed/PATH discovery precedence.
- [x] Resolve absolute regular executable.
- [x] Run bounded direct `--version`/required help checks.
- [x] Enforce supported syntax/version contract.
- [x] Perform no update/login/create/DNS/service operation.
- [x] Validate one named-tunnel id/mode.
- [x] Validate protected regular credentials reference and platform permissions.
- [x] Avoid reading/logging credential content except minimal approved consistency metadata.
- [x] Reject arbitrary provider fragments/options/secrets.
- [ ] Keep any second credential mode separately discriminated and tested.

## Runtime ingress/config

- [x] Create protected unique runtime directory outside repo/board.
- [x] Use safe serializer accepted by tested cloudflared.
- [x] Map one exact hostname to one exact loopback origin.
- [x] Add terminal `http_status:404` catch-all.
- [x] Include allowlisted fields only.
- [x] Include no provider credential content or Kanmer bearer/verifier.
- [x] Create config exclusively and read back/parse in tests.
- [x] Reject control/newline/metacharacter injection.
- [x] Remove runtime config/directory on every terminal path.

## Metrics/readiness

- [x] Bind metrics/readiness to loopback only.
- [x] Use canonical/bounded port allocator with collision handling.
- [x] Poll documented readiness with timeout/abort/size limits.
- [x] Require readiness, not child existence/log prose, for connected.
- [x] Move degraded/recovered on readiness loss/return.
- [x] Release poller/port resources idempotently.
- [x] Test success, timeout, malformed, flap, exit, collision, cleanup; readiness request aborts are bounded.

## Process safety and logs

- [x] Build exact direct argument array and validate ordering against installed version.
- [x] Use `shell: false`, neutral cwd, owned process group/tree, no-autoupdate.
- [x] Use minimal environment and omit bearer/verifier/development/unrelated secret variables.
- [x] Capture PID/version/attempt before output processing.
- [ ] Request structured logs where supported.
- [x] Bound line/ring-buffer size and rate.
- [x] Parse defensively and map allowlisted fields only.
- [x] Redact credential/bearer/path/id/URL canaries.
- [x] Never use log prose as primary readiness.
- [x] Test exact argv/env/cwd/options and malicious output.

## Attempt lifecycle and supervisor

- [x] Implement validated adapter state transitions and deterministic terminal result.
- [x] Attach child listeners before readiness polling.
- [x] Clean resources on validation/spawn/readiness/exit/stop failures.
- [x] Distinguish intentional, deterministic, transient, and origin-invalid failures.
- [x] Make stop/wait/dispose idempotent.
- [x] Guarantee one active attempt/child.
- [x] Implement bounded exponential backoff/jitter/attempt cap/stable reset.
- [x] Restart transient failures only.
- [x] Never restart intentional/config/security/origin failures.
- [x] Cancel timers on stop/config generation change.
- [x] Prevent stale attempt events changing current state.
- [x] Test all sequences with fake clock/randomness and no sleeps.

## Remote-host composition

- [x] Start authenticated HTTP host first.
- [x] Verify local auth/project MCP handshake before provider spawn.
- [x] Pass only origin and non-secret generation metadata to adapter.
- [ ] Keep local/auth/provider/public-verification health dimensions separate.
- [x] Stop tunnel on origin/project/auth generation change.
- [x] Keep healthy local host when provider alone fails.
- [x] Close HTTP sessions/listener before the tunnel child on parent/operator shutdown (FRD-025 RA-TUNNEL-6).
- [x] Make combined shutdown bounded/idempotent.
- [x] Emit machine-readable redacted status.
- [x] Keep stdio/local HTTP defaults tunnel-free.

## Tests and verification

- [x] Add deterministic fake cloudflared executable.
- [x] Test local origin/auth failure prevents spawn.
- [x] Test valid local host reaches provider-connected.
- [x] Test public state remains unverified until doctor.
- [x] Test origin/project/auth change stops forwarding.
- [x] Test crash/restart/backoff/reset/exhaustion.
- [x] Test intentional stop/no restart/no residue.
- [ ] Test graceful/forced process-tree shutdown on Windows/POSIX.
- [ ] Test spaces/metacharacters remain data.
- [x] Test metrics collision/readiness failure/flap.
- [x] Test exact ingress/catch-all and canary absence.
- [x] Test Quick Tunnel absent/rejected.
- [x] Test adapter performs no board/tool mutation.
- [x] Add built fake-provider remote smoke.
- [ ] Run optional real-binary version/help/config smoke only with explicit path.
- [x] Leave real public proof to MCP-028.
- [x] Confirm no MCP tool/count/reference change.
- [ ] Run tests, typecheck, build, HTTP/remote smokes, root verify, and Windows PR rail.
- [x] Rebuild plugin only if canonical stdio bytes intentionally change.
- [x] Run `git diff --check`; inspect process table/temp/runtime/board residue.
- [x] Record version/flags/config/argv/readiness/restart/shutdown/canary evidence.
- [x] Stop before public acceptance or merge.

## Roadmap amendment — Cloudflare Tunnel-only mode

- [x] Restrict v1 to locally managed named-tunnel credential-file configuration; reject remote-managed token, Access and Quick Tunnel modes.
- [x] Run cloudflared ingress validation and exact-host ingress-rule checks against generated config without provider mutation.
- [x] Prove the adapter starts only after MCP-026 reports a healthy bearer-authenticated loopback origin.


## Checklist reconciliation (f6c7d196)

The remaining unchecked items are deliberate scope or environment limits: discovery precedence, a second credential mode, structured logs, full health-dimension expansion, cross-platform process-tree execution, spaces/metacharacter vectors not covered by this rail, optional real cloudflared binary smoke, and Windows/CI-only verification. Implemented collision ownership, idempotent lease cleanup, mandatory local handshake, terminal config-exit policy, readiness flap transitions, and final evidence are checked above.
