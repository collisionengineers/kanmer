Use the connector doctor before changing configuration. Run the narrowest mode that answers the question: `config` checks inputs, `local` checks the authenticated loopback path, and `public` adds DNS, TLS, and route checks. A skipped check means a prerequisite failed; it is not a pass. Repairs are bounded guidance, not automatic mutation. Never publish bearer values, provider credentials, session identifiers, raw child output, or machine-specific paths.

## Doctor checks

| Check | Mode / layer | What passing means | Safe repair and rerun |
|---|---|---|---|
| `PROJECT_CONFIG_VALID` | all / project | The selected project identity and board configuration are readable. | Open the intended project, repair its board, then rerun `config`. |
| `REMOTE_CONFIG_VALID` | all / remote | The remote profile has one supported provider and complete fields. | Correct the profile and exact hostname; rerun `config`. |
| `SECRET_REFERENCE_VALID` | all / secret | The token reference points to a protected, regular, non-symlinked secret. | Recreate the protected token file or OS secret; rerun `config`. |
| `TUNNEL_EXECUTABLE_VALID` | all / provider | The configured executable is absolute, present, and reports a supported version. | Install or select the operator-managed executable; rerun `config`. |
| `TUNNEL_CONFIG_VALID` | all / provider | Tunnel id, credential reference, hostname, and loopback origin form one exact route. | Correct the named-tunnel fields; rerun `config`. |
| `LOCAL_STATUS_READY` | local/public / local | The local host reports ready within its bounded deadline. | Inspect the local status and stop stale children; rerun `local`. |
| `LOCAL_BIND_LOOPBACK` | local/public / local | The listener is bound only to the loopback interface. | Remove broad binds and restart; rerun `local`. |
| `AUTH_MISSING_REJECTED` | local/public / auth | A request without a bearer is rejected before MCP work. | Check client header injection; rerun `local`. |
| `AUTH_WRONG_REJECTED` | local/public / auth | An incorrect bearer is rejected before MCP work. | Replace the client secret; rerun `local`. |
| `AUTH_VALID_ACCEPTED` | local/public / auth | The protected bearer reaches the authenticated host. | Rotate or recreate the protected secret if needed; rerun `local`. |
| `MCP_INITIALIZE_LOCAL` | local/public / MCP | A normal MCP initialize succeeds locally. | Use the supported Streamable HTTP client and endpoint; rerun `local`. |
| `PROJECT_FINGERPRINT_LOCAL` | local/public / identity | The local response matches the selected project fingerprint. | Reopen or reconcile the project; rerun `local`. |
| `REMOTE_TOOL_POLICY_LOCAL` | local/public / policy | The local tool surface and workflow gates are intact. | Do not bypass gates; fix the selected project and rerun `local`. |
| `SESSION_CLOSE_LOCAL` | local/public / session | The local MCP session closes cleanly. | Stop stale clients and rerun `local`. |
| `TUNNEL_PROCESS_READY` | local/public / provider | The owned tunnel child reaches bounded readiness. | Check executable/version/credentials and rerun `local`. |
| `PUBLIC_DNS_RESOLVES` | public / DNS | The configured hostname resolves without changing records. | Repair DNS with the provider operator, then rerun `public`. |
| `PUBLIC_TLS_VALID` | public / TLS | The certificate is valid for the exact hostname. | Repair the provider certificate/hostname chain; rerun `public`. |
| `PUBLIC_ROUTE_NO_REDIRECT` | public / route | HTTPS reaches `/mcp` without an identity redirect. | Remove redirects or unrelated access layers; rerun `public`. |
| `AUTH_MISSING_PUBLIC_REJECTED` | public / auth | The public route rejects a missing bearer. | Check tunnel route and client header handling; rerun `public`. |
| `MCP_INITIALIZE_PUBLIC` | public / MCP | A public MCP initialize succeeds with the bearer. | Fix the route/client and rerun `public`. |
| `PROJECT_FINGERPRINT_PUBLIC` | public / identity | Public identity equals the local selected project. | Stop the route and correct project selection; rerun `public`. |
| `REMOTE_TOOL_POLICY_PUBLIC` | public / policy | Public tools retain local policy and gates. | Treat a mismatch as unsafe; stop and escalate, then rerun `public`. |
| `SESSION_CLOSE_PUBLIC` | public / session | The public MCP session closes cleanly. | Stop stale clients and rerun `public`. |
| `LOCAL_PUBLIC_CONSISTENT` | public / consistency | Local and public health describe one endpoint and generation. | Reconcile and restart the selected project; rerun `public`. |
| `DIAGNOSTIC_REDACTION` | all / safety | Report details contain no secret, credential, session, or unsafe path material. | Remove the exposed diagnostic and rotate the bearer; rerun the same mode. |
| `NO_BOARD_MUTATION` | all / safety | Doctor did not create, move, edit, or archive board content. | Stop if mutation is observed and preserve redacted evidence for escalation. |

The order is deliberate: later checks depend on earlier checks. A `skipped` result names the prerequisite that failed. Human output is convenient for an operator; `--json` is the stable integration form. Exit code 0 is healthy, 1 reports a failed or warned check, and 2 means the doctor itself could not complete.

## Safe escalation

Keep the endpoint disabled while configuration is invalid. Do not solve a hostname error by disabling TLS, widening the bind address, putting a token in a URL, using a Quick Tunnel for production, or forcing another process's ownership. Capture only the mode, check id, status, safe summary, and redacted repair code. Provider-specific actions belong in the Cloudflare appendix; generic client or project problems belong with the project owner.
