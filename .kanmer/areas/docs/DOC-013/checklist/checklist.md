# Checklist — DOC-013

## Canonical sources and locations

- [ ] Confirm canonical manual root/index and update ticket paths if different.
- [ ] Read accepted remote FRD/ADR and requirement ids.
- [ ] Read final MCP-021/025/026/027 and GUI-095 implementations/reports.
- [ ] Read actual package commands/help, GUI labels/states, doctor registry/exits, storage/quit behavior, cloudflared mode/version.
- [ ] Read MCP-028 proof/limitations when available.
- [ ] Re-check official MCP/Electron/Cloudflare source titles relied on by implementation.
- [ ] Map every FRD requirement and doctor id to a manual section.
- [ ] Stop on implementation/FRD conflict rather than document fiction.

## Terminology and security model

- [ ] Define project fingerprint, remote host, loopback origin, public endpoint, adapter/provider, cloudflared, bearer, provider credential, session, connected, verified, GUI/headless owner.
- [ ] Keep bearer and provider credentials distinct everywhere.
- [ ] State one project per endpoint/process and stdio unchanged.
- [ ] State mandatory bearer in addition to provider TLS/access controls.
- [ ] State remote dispatch exclusion and normal Kanmer gates.
- [ ] State possession/no per-user attribution/one token/session-rotation limits.
- [ ] State GUI-owned access ends on true app quit.
- [ ] List every unsupported/deferred feature once.
- [ ] Add terminology/provider-neutral validation.

## Primary manual

- [ ] Create all required headings/anchors.
- [ ] Add provider-neutral architecture diagram and three health dimensions.
- [ ] Add checkable prerequisites mapped to doctor checks.
- [ ] Explain secure storage/headless protection and duplicate ownership.
- [ ] Verify exact GUI navigation/fields/actions/statuses/confirmations.
- [ ] Document configure→generate→save→start→doctor→client flow.
- [ ] Document multi-project auto-start/uniqueness/failure isolation.
- [ ] Document connected versus verified/stale.
- [ ] Document rotation/lost token/project move/remove/quit.
- [ ] Use no screenshots unless maintained; never capture a real secret.
- [ ] Link failures to exact troubleshooting entries.

## Headless commands

- [ ] Build/install actual CLI in a path with spaces.
- [ ] Capture exact command names/flags/schema/stdout/stderr/exits from built help.
- [ ] Execute protected token-file creation and no-overwrite behavior.
- [ ] Execute disposable remote config/start/readiness/config/local doctor/stop.
- [ ] Use MCP-028 safe public report only where available.
- [ ] Test/document Bash and PowerShell only where actually supported.
- [ ] Include no raw token arg/env/plain settings.
- [ ] Distinguish external process supervision from shipped Kanmer ownership.
- [ ] Explain GUI/headless ownership conflict.
- [ ] Show safe expected output without machine paths/raw logs.

## Remote client setup

- [ ] Confirm exact endpoint/base-path semantics.
- [ ] Document standard HTTPS and Authorization bearer contract.
- [ ] Require normal MCP initialize and expected project/tool verification.
- [ ] Use obvious placeholders.
- [ ] Add client-specific examples only after current format/version test.
- [ ] Label tested client examples with version/date/platform.
- [ ] Omit guessed formats.
- [ ] Explain post-rotation client update/reconnect.

## Troubleshooting matrix

- [ ] Include all 26 exact doctor ids once and no unknown ids.
- [ ] For each: layer, mode, pass condition, safe details, causes, ordered repairs, status/log location, rerun mode, stop/escalate.
- [ ] Explain prerequisite skips and exits 0/1/2.
- [ ] Cover common config/auth/project/tool/tunnel/DNS/TLS/redirect/session/redaction/no-mutation scenarios.
- [ ] Use provider-neutral repairs where possible.
- [ ] Link cloudflared-specific repairs to appendix.
- [ ] Prohibit insecure TLS, wildcard, Quick Tunnel production, token URL, raw log publication, force takeover, blind retry.
- [ ] Add structural exact-id coverage validation.

## Cloudflared appendix

- [ ] State first adapter, not generic architecture.
- [ ] Verify exact supported named-tunnel mode and executable behavior.
- [ ] Cite/link current official provider documentation by repo convention.
- [ ] Document external install/provision tunnel/hostname/DNS/credential reference.
- [ ] Include no account-specific values or credentials.
- [ ] Document exact GUI/headless fields and doctor errors.
- [ ] Explain readiness/update/replacement/rollback.
- [ ] State Quick Tunnels unsupported for production.
- [ ] State provider access controls do not replace bearer.
- [ ] Claim no Kanmer account/DNS/download automation.

## Security, lifecycle, and limitations

- [ ] Document start/stop/auto-start/status/stale verification/doctor cadence.
- [ ] Document secure backend/file/clipboard/session/project/tunnel/log boundaries.
- [ ] Document token rotation/revoke/lost-token incident response.
- [ ] Document project reconciliation and provider-resource non-deletion.
- [ ] Document all v1 non-goals accurately.
- [ ] State remote bearer can invoke approved mutating board tools but cannot bypass workflow gates.
- [ ] Warn users to review redacted diagnostics before sharing.

## Indexes, validation, and walkthroughs

- [ ] Add manual/provider/troubleshooting to canonical indexes.
- [ ] Add one concise root README pointer; coordinate DOC-008.
- [ ] Add FRD/ADR traceability links only where canonical.
- [ ] Validate every relative link/anchor/diagram/code fence.
- [ ] Assert required headings/anchors/files.
- [ ] Assert provider-neutral main file contains no provider command/account setup.
- [ ] Scan forbidden raw token/insecure/wildcard/Quick-Tunnel/real path/hostname/session patterns.
- [ ] Run canary scan.
- [ ] Execute every documented command in disposable fixtures.
- [ ] Walk GUI path using only manual.
- [ ] Walk headless path using only manual.
- [ ] Complete unfamiliar-reviewer usability check.
- [ ] Compare every UI label and doctor id/repair with built implementation.
- [ ] Run docs/root verification and `git diff --check`.
- [ ] Search/replace duplicate stale remote instructions within scope.
- [ ] Record traceability, command/platform/UI, review, link/anchor/secret results and deferred examples.
- [ ] Stop before merge.

## Roadmap amendment — Cloudflare documentation boundary

- [ ] State named Tunnel plus Kanmer bearer as the only current Cloudflare path.
- [ ] State Cloudflare Access, Quick Tunnels, remote-managed token mode and hosted Workers are unsupported.
- [ ] Describe the Worker only as redacted MCP-028 integration evidence; keep OpenAI instructions in DOC-010.
