# Checklist — DOC-013

## Evidence gates (must precede user-visible claims)

- [x] Re-read merged MCP-027 PR #114 (`765c3f6f3ef27ea8b7d7223267b181a19a7d0de6`) report/proof and record the shipped doctor contract.
- [ ] Wait for GUI-095 independent review, merge to main, and post-implementation report/proof before writing exact GUI labels, storage behavior, ownership, lifecycle, rotation, or doctor UI wording.
- [ ] Re-read merged GUI-095 source/tests/report/proof immediately before implementing the manual; do not use provisional worktree files as the contract.
- [ ] Re-read MCP-028 merged proof before making public-provider, Worker, or disposable end-to-end success claims.
- [ ] Stop and escalate any implementation/FRD/ADR conflict rather than documenting an inferred behavior.

## Canonical sources and generated manual

- [x] Confirm `docs/manual/` is the authored manual root and that it currently contains 19 chapters.
- [x] Confirm `scripts/build-manual.mjs` owns chapter order and `apps/gui/src/renderer/src/manual/chapters.generated.ts` is generated.
- [ ] Add `remote-access.md`, `remote-access-troubleshooting.md`, and `providers/cloudflared.md`; do not create `docs/manual/README.md`.
- [ ] Add the three chapters to `CHAPTERS` in reading order and regenerate the committed artifact.
- [ ] Add at most one concise root README pointer, coordinating with DOC-008; do not duplicate setup instructions.
- [ ] Keep `docs/manual/connect.md` OpenAI Secure MCP Tunnel/stdio guidance separate.

## Contract and terminology

- [x] Confirm MCP-027 source paths: `doctor-cli.ts`, `doctor/types.ts`, `doctor/checks.ts`, `doctor/index.ts`, and `doctor/render.ts`.
- [x] Confirm `kanmer-doctor` is the packaged bin, with modes `config|local|public`, optional `--json`, and exits 0/1/2.
- [x] Confirm the registry has exactly 26 canonical check ids and schema version 1.
- [x] Confirm `kanmer-mcp-remote` accepts no arguments and uses protected token/tunnel configuration.
- [ ] Build a traceability worksheet mapping every FRD-025 requirement and all 26 doctor ids to manual headings and implementation tickets.
- [ ] Define project fingerprint, remote host, loopback origin, public endpoint, adapter/provider, bearer, provider credential, session, connected, verified/stale, GUI owner, and headless owner.
- [ ] Keep Kanmer bearer and provider credentials distinct in every chapter and example.
- [ ] State one project/fingerprint per endpoint/process, unchanged stdio, mandatory bearer, normal workflow gates, and v1 possession/one-token/no-per-user limits.
- [ ] List unsupported/deferred features once and link to that limitations section.

## Provider-neutral remote-access chapter

- [ ] Create the overview, audience, security warning, and architecture/health-dimensions sections.
- [ ] Document prerequisites without claiming Kanmer creates provider resources, DNS, or executables.
- [ ] After GUI-095 evidence is merged, document exact GUI navigation, fields, validation, save/start states, owner conflicts, auto-start, true quit, rotate/revoke, and doctor presentation.
- [ ] Document the headless path from built `kanmer-mcp-remote`/token/doctor command behavior and disposable runs only.
- [ ] Explain configure/start/stop, connected versus publicly verified, stale verification, project reconciliation, lost-token recovery, and redacted diagnostics.
- [ ] Explain generic HTTPS `/mcp` and `Authorization: Bearer <token>` without guessing client-specific formats.
- [ ] Add client-specific recipes only when a current disposable version/platform test is recorded and dated.
- [ ] State the complete v1 non-goals, including no remote dispatch, OAuth/per-user identity, multiple active tokens, grace rotation, WebSocket/browser API, managed relay, persistent sessions, provider automation, or hosted Worker.

## Headless command evidence

- [ ] Build/install in a disposable path containing spaces.
- [ ] Capture exact packaged command names, accepted arguments, protected env/config references, output, and exits from built help/source.
- [ ] Test protected token-file creation, permissions, no-overwrite, rotation, and redacted status/fingerprint behavior.
- [ ] Run disposable remote config/start/readiness and config/local doctor flows; test safe stop/cleanup.
- [ ] Use only merged MCP-028 public evidence for public mode/route claims.
- [ ] Document Bash or PowerShell examples only when actually tested; never publish raw tokens, arbitrary URLs, insecure flags, or internal test-injection variables.
- [ ] Explain external process supervision as operator-owned and document GUI/headless ownership conflict and resolution.

## Doctor troubleshooting matrix

- [ ] Include each of the 26 canonical ids exactly once and no unknown ids, in registry/execution order.
- [ ] For each id record layer, applicable mode, pass condition, safe observed/expected fields, likely causes, ordered repairs, rerun mode, and stop/escalate condition.
- [ ] Derive repair codes/actions from `doctor/checks.ts`; derive redaction/JSON/human wording from `doctor/index.ts` and `doctor/render.ts`.
- [ ] Explain prerequisite-driven `skipped` checks, schema v1, JSON versus human output, and exits 0/1/2.
- [ ] Cover project/config/secret/executable/tunnel/local/auth/MCP/fingerprint/tool-policy/session/DNS/TLS/redirect/consistency/redaction/no-mutation scenarios.
- [ ] Link cloudflared-specific repairs to the appendix and use provider-neutral repairs elsewhere.
- [ ] Prohibit TLS bypass, wildcard bind, Quick Tunnel production, token-in-URL, raw-log sharing, force takeover, and blind retry.

## Cloudflared provider appendix

- [ ] State that this is the first adapter and not the provider-neutral architecture.
- [ ] Verify the supported named-tunnel mode, executable, tunnel id, stable hostname/DNS route, protected credential reference, and loopback origin from merged MCP-021/025/026/027 evidence.
- [ ] Document external install/provisioning and exact confirmed GUI/headless fields without account-specific values.
- [ ] Explain readiness, update/replacement, rollback, and doctor interpretation.
- [ ] State Access does not replace the Kanmer bearer; Quick Tunnels are not the production path.
- [ ] Claim no Kanmer account/DNS automation or executable download.

## Docs verifier and indexes

- [ ] Add `scripts/verify-docs.mjs` and root `verify:docs` only if no other ticket supplies them; do not redefine shared root `verify`.
- [ ] Assert required files/headings/anchors, exact 26-id coverage, provider-neutral separation, and generated-manual freshness.
- [ ] Scan forbidden secret/insecure/wildcard/Quick-Tunnel/real-path/real-host/session patterns and run a unique canary check.
- [ ] Validate relative links, anchors, code fences, diagram text, and line endings deterministically/offline.
- [ ] Add manual/provider/troubleshooting index entries and canonical FRD/ADR links.
- [ ] Search for duplicate/stale remote instructions within DOC-013 scope and replace with links where appropriate.

## Walkthroughs and handoff

- [ ] Run `npm run check:manual`, `npm run verify:docs`, `npm test`, `npm run typecheck`, and `git diff --check`; record exit codes.
- [ ] Walk GUI setup using only the manual after GUI-095 is merged; compare every label/state/action with the built app.
- [ ] Walk headless setup using only the manual in a path with spaces; compare command/output/exit claims with the built package.
- [ ] Run every documented safe command and record platform/version/result without secrets or machine-specific paths.
- [ ] Use a reviewer unfamiliar with internals to identify endpoint, bearer/provider credential distinction, connected/verified distinction, doctor mode, rotation, stop, and limitations.
- [ ] Run secret/canary scans and record traceability, command/platform, UI, review, link/anchor, and security results in the post-implementation report.
- [ ] Stop before merge; do not take or move DOC-013 in this preparation pass.

## Roadmap amendment — Cloudflare documentation boundary

- [ ] State locally managed named Cloudflare Tunnel plus mandatory Kanmer bearer as the only current Cloudflare path.
- [ ] State Cloudflare Access, Quick Tunnels, remote-managed token mode, account/DNS automation, and hosted Workers are unsupported here.
- [ ] Describe a Worker only as redacted MCP-028 integration evidence; keep OpenAI instructions in DOC-010 and future GUI work in GUI-104.
