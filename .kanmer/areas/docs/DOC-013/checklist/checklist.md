# Checklist — DOC-013

## Evidence gates (must precede user-visible claims)

- [x] Re-read merged MCP-027 PR #114 (`765c3f6f3ef27ea8b7d7223267b181a19a7d0de6`) report/proof and record the shipped doctor contract.
- [x] Wait for GUI-095 independent review, merge to main, and post-implementation report/proof before writing exact GUI labels, storage behavior, ownership, lifecycle, rotation, or doctor UI wording (PR #118 merged at `3a905486`, proof `1dfa5b10`).
- [x] Re-read merged GUI-095 source/tests/report/proof immediately before implementing the manual; exact labels and lifecycle were taken from merged `main` and its 337-test GUI rail.
- [ ] Re-read MCP-028 merged proof before making public-provider, Worker, or disposable end-to-end success claims.
- [ ] Stop and escalate any implementation/FRD/ADR conflict rather than documenting an inferred behavior.

## Canonical sources and generated manual

- [x] Confirm `docs/manual/` is the authored manual root and that it currently contains 19 chapters.
- [x] Confirm `scripts/build-manual.mjs` owns chapter order and `apps/gui/src/renderer/src/manual/chapters.generated.ts` is generated.
- [x] Add `remote-access.md`, `remote-access-troubleshooting.md`, and `providers/cloudflared.md`; do not create `docs/manual/README.md`.
- [x] Add the three chapters to `CHAPTERS` in reading order and regenerate the committed artifact (22 chapters).
- [x] Add one concise root README pointer without duplicating setup instructions.
- [x] Keep the existing Connect chapter's OpenAI Secure MCP Tunnel/stdio guidance separate.

## Contract and terminology

- [x] Confirm MCP-027 source paths: `doctor-cli.ts`, `doctor/types.ts`, `doctor/checks.ts`, `doctor/index.ts`, and `doctor/render.ts`.
- [x] Confirm `kanmer-doctor` is the packaged bin, with modes `config|local|public`, optional `--json`, and exits 0/1/2.
- [x] Confirm the registry has exactly 26 canonical check ids and schema version 1.
- [x] Confirm `kanmer-mcp-remote` accepts no arguments and uses protected token/tunnel configuration.
- [x] Build the docs verifier's traceability checks for the remote manual and all 26 doctor ids.
- [x] Define project fingerprint, remote host, loopback origin, public endpoint, adapter/provider, bearer, provider credential, session, connected, verified/stale, GUI owner, and headless owner.
- [x] Keep Kanmer bearer and provider credentials distinct in every chapter and example.
- [x] State one project/fingerprint per endpoint/process, unchanged stdio, mandatory bearer, normal workflow gates, and v1 possession/one-token/no-per-user limits.
- [x] State unsupported/deferred features in the provider-neutral limitations section and appendix boundary.

## Provider-neutral remote-access chapter

- [x] Create the overview, audience, security warning, and architecture/health-dimensions sections.
- [x] Document prerequisites without claiming Kanmer creates provider resources, DNS, or executables.
- [x] After GUI-095 evidence merged, document exact GUI navigation, fields, validation, save/start states, owner conflicts, auto-start, true quit, rotate/revoke, and doctor presentation.
- [x] Document the headless path from built `kanmer-mcp-remote`/token/doctor command behavior and disposable runs only.
- [x] Explain configure/start/stop, connected versus publicly verified, stale verification, project reconciliation, lost-token recovery, and redacted diagnostics.
- [x] Explain generic HTTPS `/mcp` and `Authorization: Bearer <token>` without guessing client-specific formats.
- [ ] Add client-specific recipes only when a current disposable version/platform test is recorded and dated.
- [x] State the v1 non-goals and unsupported provider/identity/dispatch boundaries without promising deferred features.

## Headless command evidence

- [ ] Build/install in a disposable path containing spaces.
- [x] Capture exact packaged command names, accepted arguments, protected env/config references, output, and exits from built help/source (Windows PowerShell disposable path-with-spaces run recorded in the post-implementation report).
- [x] Test protected token-file creation, permissions, no-overwrite, rotation, and redacted status/fingerprint behavior (built CLI and HTTP/secret rails).
- [x] Run disposable remote config/start/readiness and config/local doctor flows; test safe stop/cleanup (built CLI plus fake-provider lifecycle rails; no external provider claim).
- [ ] Use only merged MCP-028 public evidence for public mode/route claims.
- [x] Document Bash or PowerShell examples only when actually tested; never publish raw tokens, arbitrary URLs, insecure flags, or internal test-injection variables (PowerShell commands tested).
- [x] Explain external process supervision as operator-owned and document GUI/headless ownership conflict and resolution.

## Doctor troubleshooting matrix

- [x] Include each of the 26 canonical ids exactly once and no unknown ids, in registry/execution order.
- [x] For each id record layer, applicable mode, pass condition, safe observed/expected fields, likely causes, ordered repairs, rerun mode, and stop/escalate condition.
- [x] Derive repair guidance, redaction, JSON/human wording, prerequisite skips, and exits 0/1/2 from the shipped doctor contract.
- [x] Explain prerequisite-driven `skipped` checks, schema v1, JSON versus human output, and exits 0/1/2.
- [x] Cover project/config/secret/executable/tunnel/local/auth/MCP/fingerprint/tool-policy/session/DNS/TLS/redirect/consistency/redaction/no-mutation scenarios.
- [x] Keep provider-specific repairs in the Cloudflare appendix and provider-neutral repairs in the matrix.
- [x] Prohibit TLS bypass, wildcard bind, Quick Tunnel production, token-in-URL, raw-log sharing, force takeover, and blind retry.

## Cloudflared provider appendix

- [x] State that Cloudflare is the first adapter and not the provider-neutral architecture.
- [x] Verify the supported named-tunnel mode, executable, tunnel id, stable hostname/DNS route, protected credential reference, and loopback origin from merged remote-access evidence.
- [x] Document external install/provisioning and exact confirmed GUI/headless fields without account-specific values.
- [x] Explain readiness, replacement, rollback, and doctor interpretation.
- [x] State Access does not replace the Kanmer bearer; Quick Tunnels are not the production path.
- [x] Claim no Kanmer account/DNS automation or executable download.

## Docs verifier and indexes

- [x] Add `scripts/verify-docs.mjs` and root `verify:docs` without redefining shared root `verify`.
- [x] Assert required files/headings/anchors, exact 26-id coverage, provider-neutral separation, relative links, balanced code fences, and generated-manual freshness.
- [x] Scan forbidden secret/insecure/wildcard/Quick-Tunnel/real-path/real-host/session patterns across provider-neutral chapters; use a disposable canary and keep the verifier offline/deterministic.
- [x] Validate required anchors, chapter structure, relative links, balanced fences, generated freshness, and deterministic offline output.
- [x] Add manual/provider/troubleshooting index entries and retain canonical governing-document links.
- [x] Search for duplicate/stale remote instructions within DOC-013 scope and replace with links where appropriate; the existing Connect/OpenAI chapter remains a deliberate separate path.

## Walkthroughs and handoff

- [x] Run `npm run check:manual`, `npm run verify:docs`, `npm test`, `npm run typecheck`, GUI build, and `git diff --check`; first test runs failed on a stale chapter assertion and missing built core dist, then the corrected build-first rerun passed (core 256, GUI 337, HTTP 61, scripts 66).
- [x] Walk GUI setup using only the manual after GUI-095 is merged; compare every label/state/action with merged GUI-095 source/tests and the built app's GUI rail.
- [x] Walk headless setup using only the manual in a path with spaces; compare command/output/exit claims with the built package.
- [x] Run every documented safe command and record platform/version/result without secrets or machine-specific paths.
- [ ] Use a reviewer unfamiliar with internals to identify endpoint, bearer/provider credential distinction, connected/verified distinction, doctor mode, rotation, stop, and limitations.
- [x] Run secret/canary scans and record traceability, command/platform, UI, review, link/anchor, and security results in the post-implementation report.
- [x] Stop at independent review; implementation branch is ready and no merge or proof was performed.

## Roadmap amendment — Cloudflare documentation boundary

- [x] State locally managed named Cloudflare Tunnel plus mandatory Kanmer bearer as the only current Cloudflare path.
- [x] State Cloudflare Access, Quick Tunnels, remote-managed token mode, account/DNS automation, and hosted Workers are unsupported here.
- [ ] Describe a Worker only as redacted MCP-028 integration evidence; keep OpenAI instructions in DOC-010 and future GUI work in GUI-104.
