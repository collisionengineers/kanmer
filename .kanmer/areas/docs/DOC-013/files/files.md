# Files — DOC-013

## Add

Use these paths if `docs/manual/` is the repository's canonical installed-user manual root. If the existing manual uses a different canonical root/index, place the same documents there and update this ticket's file references before implementation rather than creating a second manual tree.

| Path | Exact responsibility |
|---|---|
| `docs/manual/remote-access.md` | Provider-neutral primary manual: purpose/security boundary, concepts/diagram, prerequisites, GUI and headless setup, generic remote MCP client contract, multi-project operation, connected-versus-verified semantics, start/stop/auto-start/rotation/recovery/removal, security/limitations, and links to doctor/provider appendix. Every command/UI label must match built implementation. |
| `docs/manual/remote-access-troubleshooting.md` | Complete MCP-027 check-id matrix with layer, pass condition, likely causes, exact safe repairs, relevant status/log location, rerun mode, and stop/escalation guidance. Include all 26 stable check ids exactly once and no insecure bypasses. |
| `docs/manual/providers/cloudflared.md` | Cloudflare-specific appendix: supported named-tunnel mode, official executable installation/version verification, external tunnel/DNS/hostname provisioning, protected credentials reference, Kanmer fields, start/doctor/update/rollback, Quick Tunnel exclusion, and provider-specific check repairs. Keep account operations outside Kanmer. |

## Modify

| Path | Exact responsibility |
|---|---|
| `scripts/build-manual.mjs` | Add the three remote-access chapters to the canonical `CHAPTERS` index and regenerate the committed in-app artifact; there is no `docs/manual/README.md` in the current tree. |
| `docs/README.md` | Add the remote manual/provider/troubleshooting links to the repository documentation map where user manuals are indexed. |
| `README.md` | Add or correct one concise link to the canonical remote-access manual after the feature ships. Do not duplicate setup commands in the root README. Coordinate with DOC-008's broader README accuracy work. |
| `docs/functional/frd/FRD-025-remote-access.md` | Add final traceability links from requirement ids to the manual sections only if the FRD's traceability convention permits documentation-ticket updates. Use the actual accepted DOC-012 path/number. Do not alter requirements. |
| `docs/architecture/adr/ADR-0017-streamable-http-remote-access.md` | Add a documentation/manual consequence/reference only if canonical ADR practice requires it; do not rewrite the decision. |
| `scripts/verify-docs.mjs` | Extend the canonical docs verifier with remote-manual structural checks, complete doctor-id coverage, provider-neutral terminology boundaries, code-fence/relative-link/anchor validation, and secret-canary/pattern scanning. If another existing script owns docs validation, modify it instead and do not add a second rail. |
| `package.json` | Add exactly one `verify:docs` entry for the new canonical docs verifier if no other verifier lands first; do not add or redefine the shared root `verify` command owned by the verification-roadmap tickets. |

## Inspect and quote accurately

| Path | Reason |
|---|---|
| `docs/functional/frd/FRD-025-remote-access.md` | Normative scope/security/acceptance/terminology and actual requirement ids. |
| `docs/architecture/adr/ADR-0017-streamable-http-remote-access.md` | Architecture, alternatives, process boundaries, explicit non-goals. |
| `packages/mcp-server/package.json` | Exact installed/headless command names and supported scripts/bins. |
| `packages/mcp-server/src/remote-cli.ts` | Exact headless configuration/start/stop/status behavior and safe arguments. |
| `packages/mcp-server/src/remote-token-cli.ts` | Exact protected token-file generation behavior/output/flags. |
| `packages/mcp-server/src/doctor-cli.ts` | Shipped `config|local|public`, `--json`, protected environment references, loopback validation, and exits 0/1/2. |
| `packages/mcp-server/src/doctor/checks.ts` | Shipped ordered 26-id registry, mode applicability, prerequisite graph, and repair catalog. |
| `packages/mcp-server/src/doctor/index.ts` | Shipped orchestration, bounded/cancellable checks, prerequisite skips, cleanup, and redaction. |
| `packages/mcp-server/src/doctor/render.ts` | Human renderer derived from the canonical JSON report. |
| `packages/mcp-server/src/doctor/types.ts` | Shipped schema-v1 report/check/repair types, exact ids, statuses, severities, safe fields, and injected dependency contracts. |
| `packages/mcp-server/src/tunnels/cloudflared.ts` and config validator | Supported mode/version/fields/readiness/errors; do not document proposed flags that implementation did not ship. |
| `packages/mcp-server/src/http-auth.ts` | Token format/rotation/session invalidation and secret restrictions. |
| `apps/gui/src/main/remoteAccess/` | Exact storage/backend behavior, ownership/auto-start/quit semantics, status/action/error contracts. |
| `apps/gui/src/renderer/src/components/RemoteAccess*.tsx` | Exact navigation, labels, setup stages, buttons, confirmations, statuses, and help anchors. Use actual canonical renderer path. |
| `apps/gui/src/preload/index.d.ts` | User-visible operation/result terminology. |
| existing manual/style/terminology docs | Match headings, admonitions, command tabs, Windows/PowerShell conventions, placeholders, and link style. |
| `scripts/release.mjs` / packaged app config | Distinguish source-checkout commands from installed-app paths. |
| `.github/workflows/pr.yml` | State only verified supported platforms/commands. |
| MCP-028 proof/report | Final real public acceptance evidence and known limitations; never copy secrets/raw logs. |
| official MCP, Electron, and Cloudflare documentation used by accepted implementation | Verify current terminology and provider steps; cite titles/links according to repo docs policy. |

## Required anchors in `remote-access.md`

- `#remote-access`
- `#security-model`
- `#prerequisites`
- `#architecture-and-terms`
- `#gui-setup`
- `#headless-setup`
- `#configure-a-remote-mcp-client`
- `#start-stop-and-auto-start`
- `#run-connector-doctor`
- `#rotate-or-recover-a-token`
- `#move-or-remove-a-project`
- `#security-and-limitations`

Use the repository's actual generated-anchor convention; adjust heading text if the Markdown engine differs and update all links together.

## Complete doctor-id coverage

The troubleshooting file must contain exact entries for:

`PROJECT_CONFIG_VALID`, `REMOTE_CONFIG_VALID`, `SECRET_REFERENCE_VALID`, `TUNNEL_EXECUTABLE_VALID`, `TUNNEL_CONFIG_VALID`, `LOCAL_STATUS_READY`, `LOCAL_BIND_LOOPBACK`, `AUTH_MISSING_REJECTED`, `AUTH_WRONG_REJECTED`, `AUTH_VALID_ACCEPTED`, `MCP_INITIALIZE_LOCAL`, `PROJECT_FINGERPRINT_LOCAL`, `REMOTE_TOOL_POLICY_LOCAL`, `SESSION_CLOSE_LOCAL`, `TUNNEL_PROCESS_READY`, `PUBLIC_DNS_RESOLVES`, `PUBLIC_TLS_VALID`, `PUBLIC_ROUTE_NO_REDIRECT`, `AUTH_MISSING_PUBLIC_REJECTED`, `MCP_INITIALIZE_PUBLIC`, `PROJECT_FINGERPRINT_PUBLIC`, `REMOTE_TOOL_POLICY_PUBLIC`, `SESSION_CLOSE_PUBLIC`, `LOCAL_PUBLIC_CONSISTENT`, `DIAGNOSTIC_REDACTION`, and `NO_BOARD_MUTATION`.

## Do not modify

- Implementation code, tool schemas, GUI behavior, provider configuration, release packaging, or accepted architecture/requirements in this documentation ticket.
- Add real secrets, hostnames, account ids, credential JSON, user paths, session ids, or board content.
- Document raw-token arguments/settings, insecure TLS, wildcard/LAN bind, Quick Tunnel production, auto-fix/account/DNS creation, OAuth, remote dispatch, multi-board endpoint, persistent sessions, or system service as shipped behavior.
- Duplicate the manual in root README or provider-specific main sections.
- Guess commands/UI labels before reading and executing the actual built feature.

## Research confirmation — 2026-08-21

The initial surface was surveyed against the current checkout. These corrections apply before implementation:

- `docs/manual/README.md` does not exist. The current in-app manual index is the `CHAPTERS` table in `scripts/build-manual.mjs`, with committed output at `apps/gui/src/renderer/src/manual/chapters.generated.ts`; add the remote chapters there and regenerate/check the artifact. `docs/manual/connect.md` is the separate OpenAI Secure MCP Tunnel chapter and must remain separate.
- `scripts/verify-docs.mjs`, `scripts/verify.mjs`, `verify:docs`, and root `verify` do not exist in this checkout. DOC-013 will add the structural/secret/link rail as a new `scripts/verify-docs.mjs` plus one `verify:docs` script, while leaving the shared root `verify` command to the verification-roadmap tickets.
- Current remote source files are TypeScript: `packages/mcp-server/src/remote-cli.ts`, `remote-token-cli.ts`, `http-cli.ts`, `http.ts`, `http-auth.ts`, `http-secret.ts`, `doctor-cli.ts`, `doctor/types.ts`, `doctor/checks.ts`, `doctor/index.ts`, and `tunnels/*`. MCP-027 merged these files and its proof records the 26-id report/CLI rail.
- Main currently has no committed GUI remote-access integration. The GUI-095 worktree contains provisional `apps/gui/src/main/remoteAccess/{configStore,identity,secrets,types}.ts` helpers but no merged main/preload/renderer wiring or final labels; treat all GUI paths as evidence-dependent until GUI-095’s independent review, merge, and proof.
- Exact doctor output/repair text is shipped by MCP-027 and must be quoted from merged `doctor/checks.ts`, `doctor/render.ts`, `doctor-cli.ts`, tests, and proof. Public provider/DNS/TLS acceptance remains downstream of MCP-028 and must not be claimed before its merged proof.
