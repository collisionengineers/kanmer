# Open questions — MCP-027

## Resolved decisions

- **Library/CLI or MCP tool?** Local library plus CLI only. It is not remotely exposed and cannot become an arbitrary network scanner for remote callers.
- **Modes?** `config`, `local`, and `public`, all using one ordered check registry.
- **Does config mode start a tunnel or make network changes?** No. It validates only.
- **Does local/public mode mutate the board?** No. Use MCP initialization, discovery, one canonical read-only orientation/status call, and session close.
- **How is the valid bearer obtained?** Through MCP-026's protected secret-provider abstraction or GUI credential callback, never `--token`, URL, cookie, or ordinary settings.
- **How is the wrong-token check generated?** Independently generated same-shape random token; never alter or derive a near-copy by logging/mutating the real token.
- **Can the doctor target an arbitrary URL?** No in normal operation. Public mode uses the validated configured hostname for the selected remote configuration.
- **TLS policy?** Standard platform certificate/hostname verification only. No insecure result can count as pass.
- **Redirect policy?** Do not automatically follow redirects; a redirect/login page is a failed route check.
- **Which MCP implementation is used?** Official SDK Streamable HTTP client for successful initialization/discovery/session lifecycle; raw HTTP only for negative status/header/redirect edges.
- **Which remote tools are expected?** Import the exact canonical `remote-http-v1` exposure set from MCP-025; do not duplicate a list.
- **How is project identity established?** Read the canonical orientation/status tool and compare full expected/observed fingerprint; URL/hostname is not identity.
- **How are dependent failures represented?** Later checks are explicit `skipped` with the failed prerequisite reason, not omitted or reported as misleading secondary failures.
- **Report status/exit?** Stable schema-v1 JSON; warnings may exit 0, required failures exit 1, invalid invocation/internal inability to produce a reliable report exits 2.
- **Where does human output come from?** A renderer over the JSON report, never a second check path.
- **What counts as tunnel ready?** MCP-021's documented provider readiness/status, not child PID alone.
- **What counts as public healthy?** Valid DNS/TLS/no redirect, bearer enforcement, MCP initialize, expected project, exact remote tool policy, and clean session close.
- **Does the doctor auto-repair?** No. It provides ordered safe repair actions only.
- **Can provider credentials enter the report?** No. The doctor needs only references/status; it never reports credential content.
- **Can normal CI use a real public tunnel?** No. Use injected/local fixtures; MCP-028 owns controlled public proof.
- **Does this change MCP tool count/plugin?** No.

## Deferred explicitly

- `[deferred]` Automated remediation, credential rotation, tunnel/DNS/account creation.
- `[deferred]` Insecure TLS debug mode as a non-passing evidence aid.
- `[deferred]` Additional provider-specific doctor plugins beyond cloudflared.
- `[deferred]` Continuous monitoring/alerts; this ticket is an on-demand snapshot.

No unresolved implementation questions remain.
