# Checklist — MCP-028

## Exact build and environment

- [ ] Read accepted FRD/ADR, predecessor implementations/reports/proofs, GUI evidence, and DOC-013 commands.
- [ ] Record exact full commit SHA and built artifact identity.
- [ ] Refuse dirty/mismatched source or artifact.
- [ ] Record safe platform/Node/Electron/MCP SDK/cloudflared/Kanmer versions.
- [ ] Confirm dedicated non-production project/tunnel/hostname/provider credentials.
- [ ] Confirm one owner/concurrency lock and explicit provider-resource cleanup policy.
- [ ] Refuse raw bearer/provider secrets in argv or ordinary config.
- [ ] Confirm real public integration is absent from PR/push/root verify.

## Result and invocation contract

- [ ] Define schema-v1 ordered checks/status/severity/failure classifications.
- [ ] Define safe evidence, endpoint masking/fingerprint, fixture hashes, cleanup and secret scan.
- [ ] Prohibit arbitrary raw output/config/environment/request/response fields.
- [ ] Render Markdown from validated JSON only.
- [ ] Implement canonical protected operator script.
- [ ] Validate exact commit/config/path/output/timeout/ownership inputs.
- [ ] Acquire/refuse/recover concurrency lock safely.
- [ ] Register cleanup after every resource.
- [ ] Handle signals/errors through idempotent cleanup.
- [ ] Preserve exits 0/1/2 and JSON stdout purity.
- [ ] Test schema/order/aggregation/classification/lock/path/signal/output behavior locally.

## Disposable project fixture

- [ ] Create unique format-3 project outside source/real board.
- [ ] Capture full expected fingerprint.
- [ ] Create readable ticket/orientation target.
- [ ] Create versioned document mutation target with synthetic canary.
- [ ] Create deliberate workflow/document gate-blocked action.
- [ ] Create a second negative project fingerprint without a second endpoint.
- [ ] Capture before hashes/versions/activity/item counts/snapshot.
- [ ] Validate fixture invariants locally.
- [ ] Guarantee board/worktree cleanup.
- [ ] Assert no production path/name/data overlap.

## Protected secrets and provider config

- [ ] Generate ephemeral bearer through MCP-026 secure path.
- [ ] Validate protected destination/backend and safe fingerprint.
- [ ] Deliver token/verifier only through approved protected channel.
- [ ] Generate independent wrong token.
- [ ] Place no bearer in argv/URL/settings/events/proof.
- [ ] Validate named-tunnel provider config/executable/version/hostname/credential reference.
- [ ] Verify endpoint is dedicated test infrastructure.
- [ ] Verify exact hostname→loopback ingress plus 404 catch-all.
- [ ] Record provider metadata safely only.
- [ ] Run no login/create/DNS/update/service/Quick Tunnel operation.

## Local baseline

- [ ] Run exact-commit root verification.
- [ ] Run stdio source/built initialize/discovery/read smoke.
- [ ] Run isolated plugin check where applicable.
- [ ] Run remote config doctor.
- [ ] Start authenticated loopback host and run local doctor.
- [ ] Require local project/tool/auth/session/redaction/no-mutation checks.
- [ ] Record safe commands/exits/counts/hashes only.
- [ ] Abort public startup on any required local failure.
- [ ] Prove normal verification did not invoke public integration.

## Remote host and public route

- [ ] Start canonical remote host for disposable project and bearer generation.
- [ ] Verify loopback-only/auth-required/project/generation readiness.
- [ ] Complete one authenticated local MCP initialize/read.
- [ ] Start canonical named-tunnel adapter.
- [ ] Require documented provider readiness, not PID.
- [ ] Derive public endpoint from validated hostname.
- [ ] Keep public state unverified until doctor/client pass.
- [ ] Stop on origin/project/auth generation drift.
- [ ] Retain no raw cloudflared logs.
- [ ] Run public doctor and require all applicable required checks.
- [ ] Require normal public DNS, trusted TLS, and no redirect/hosts override.

## Public authentication and client

- [ ] Missing bearer returns exact generic 401/challenge.
- [ ] Independent wrong bearer returns identical outcome.
- [ ] Query/cookie bearer does not authenticate.
- [ ] Negative probes create/refresh no session and do not reach MCP handling.
- [ ] Launch official SDK client in a separate process.
- [ ] Use a separate host/network where practical; otherwise record same-runner limitation.
- [ ] Complete public MCP initialization.
- [ ] List exact `remote-http-v1` tools.
- [ ] Read full expected project fingerprint.
- [ ] Prove each remote dispatch id is unavailable before handler work.
- [ ] Prove request data cannot select another project.
- [ ] Close client/session cleanly.
- [ ] Retain only safe policy signatures/counts/fingerprint/timing.

## Remote project, version, mutation, and gates

- [ ] Read prepared document and capture safe version/hash.
- [ ] Wrong expected project fails canonically with no mutation.
- [ ] Stale/wrong document version fails canonically with no mutation.
- [ ] Exactly one correct remote mutation succeeds.
- [ ] Read back and compare expected new hash/version/content predicate.
- [ ] Assert only intended activity/document mutation occurred.
- [ ] Deliberate gate-blocked move/write fails canonically.
- [ ] Assert blocked stage/document/activity remain unchanged as expected.
- [ ] Prove bearer does not bypass any workflow/project/version gate.
- [ ] Retain only fixture ids/hashes/versions, not document canary content.

## Sessions, rotation, and tunnel recovery

- [ ] Prove public initialize/subsequent request/close lifecycle.
- [ ] Prove missing/wrong bearer cannot reuse/probe session.
- [ ] Restart owned host and prove old session invalid.
- [ ] Reinitialize and verify project/tool policy unchanged.
- [ ] Run bounded concurrent read-only requests and safe limit assertion if configured.
- [ ] Generate/persist second bearer through shipped secure path.
- [ ] Rotate in place or transactionally exactly as shipped.
- [ ] Prove old token and all old sessions fail immediately.
- [ ] Prove new token freshly initializes.
- [ ] Run public doctor for new auth generation.
- [ ] Record safe old/new fingerprints/generations only.
- [ ] Identify and terminate only the owned cloudflared child.
- [ ] Observe exact degraded/restarting metadata.
- [ ] Confirm local authenticated host remains healthy.
- [ ] Confirm no unrelated process/resource is affected.
- [ ] Verify recovery or expected bounded exhaustion.
- [ ] Rerun public doctor/orientation/tool policy after recovery.
- [ ] Intentional stop suppresses restart and removes runtime resources.

## GUI evidence

- [ ] Link exact-commit GUI-095 multi-project integration evidence.
- [ ] Require bounded auto-start, uniqueness, isolated failure, renderer reload, secure rotation, doctor, and true-app-quit cleanup tests.
- [ ] Do not require a second real public tunnel absent an FRD change.
- [ ] If GUI launches the public run, capture only safe generation/status/doctor data.

## Secret scan and cleanup

- [ ] Seed unique bearer/provider/session/document/path/client-config canaries.
- [ ] Scan argv/environment metadata, events, buffered output, doctor, GUI safe surfaces, results, runtime config, Git status, and staged artifacts.
- [ ] Permit provider credential path only where runtime config requires it; never content/bearer.
- [ ] Permit document canary only inside disposable board/read memory, never evidence.
- [ ] Scan encoded/quoted/prefixed serialization variants.
- [ ] Fail rather than post-hoc redact any leak.
- [ ] Close clients/sessions.
- [ ] Stop tunnel/restart timers/health polling.
- [ ] Stop HTTP host/verifier.
- [ ] Force only exact owned remaining process trees after grace.
- [ ] Release metrics ports/locks.
- [ ] Remove runtime/client/token/provider-copy/project/worktree/clipboard fixtures.
- [ ] Apply provider cleanup only under explicit ownership policy.
- [ ] Verify no process/port/session/timer/temp/lock/Git/board residue.
- [ ] Verify stopped public endpoint behavior.
- [ ] Run cleanup twice and require idempotency.
- [ ] Make cleanup or secret-scan failure fail overall.

## Evidence and optional workflow

- [ ] Validate final JSON result schema.
- [ ] Render Markdown only from JSON.
- [ ] Include exact commit/versions/checks/doctor counts/mutation hashes/generation traces/failure classification/limitations.
- [ ] Exclude raw logs, bodies, environment, secrets, full sessions/content, sensitive paths/account data.
- [ ] Run final canary/forbidden-field scan before atomic artifact write.
- [ ] Retain sanitized result/proof only.
- [ ] Add manual Actions workflow only with confirmed protected environment/runner.
- [ ] If added, use workflow_dispatch only, least permissions, concurrency lock, exact commit, protected inputs, unconditional cleanup, scanned short-retention artifacts.
- [ ] Otherwise document/use canonical local protected script.

## Final verification and hand-off

- [ ] Run local/fake harness tests through normal root verify.
- [ ] Run test/typecheck/build/verify/docs/stdio/plugin/HTTP/auth/tunnel/doctor/GUI regressions for exact commit.
- [ ] Execute one complete real public run with overall pass.
- [ ] Do not accept absent/failed valid run because of an environment failure.
- [ ] Obtain independent review of harness, sanitized evidence, mutation/gates, rotation/degradation, cleanup, and secret scan.
- [ ] Run `git diff --check` and confirm no secret/output/fixture staged.
- [ ] Link only sanitized evidence and update manual limitations if needed.
- [ ] Stop before merge.

## Roadmap amendment — Cloudflare Worker remote-client proof

- [ ] Deploy a disposable Worker client with bearer in a secret binding only.
- [ ] Prove initialize, expected-project/tool verification, disposable create/update/archive, session close and public doctor health.
- [ ] Prove no Access/redirect/proxy path was used and delete Worker, secret, runtime config and temporary board record.

## Deterministic harness completion (implemented in this lane)

- [x] Define schema-v1 ordered checks/status/aggregation and bounded safe reasons.
- [x] Prohibit inline bearer/provider credential material in descriptor and CLI arguments.
- [x] Register reverse-order cleanup for the disposable fixture and make it idempotent.
- [x] Create a unique disposable project fixture outside the source board.
- [x] Capture the expected project fingerprint and prove wrong-project rejection.
- [x] Create a deliberate workflow gate-blocked action.
- [x] Guarantee HTTP/session/temp-project cleanup after the client run.
- [x] Generate an ephemeral bearer through the shipped MCP-026 path.
- [x] Prove missing and independent wrong bearer rejection.
- [x] Complete official SDK MCP initialization and list exact remote policy tools.
- [x] Prove dispatch tools are unavailable through the central remote exposure policy.
- [x] Prove one bounded remote mutation and read the resulting fixture id.
- [x] Close the official SDK session cleanly.
- [x] Validate the focused JSON client/evidence path locally.
- [x] Keep live public DNS/TLS/tunnel/Worker/GUI/rotation/restart evidence explicitly INCONCLUSIVE when the protected environment is unavailable.
- [x] Keep the manual protected verifier out of ordinary root verify and CI.
- [x] Run `git diff --check` and record no secret-bearing output.

## Protected environment disposition

The remaining live-run boxes are intentionally unticked: this worktree has no Wrangler, cloudflared, Cloudflare credentials, named tunnel, protected bearer reference, or disposable Worker environment. The canonical operator script returns exit code 2 with an INCONCLUSIVE result until those protected inputs exist; no absent environment is accepted as a pass.
