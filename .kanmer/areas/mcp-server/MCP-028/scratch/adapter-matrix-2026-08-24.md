## 2026-08-24 — actual adapter matrix on current merged main (overall INCONCLUSIVE)

### Scope and safe setup

- Read MCP-028 item, gates, proof, checklist, open questions, and HZN-007 context before the run. Ticket remains **Verifying**; this note does not alter proof, checklist, stage, source, provider configuration, or retained routes/connectors.
- Fresh GitHub-origin clone of current `main` at `ef67c04e0f3a20145dcb88497fdcb97a53038ab6`: `npm ci --ignore-scripts` **PASS** (exit 0), then `npm run build` **PASS** (exit 0).
- Infisical authenticated injection was used only to make the approved Cloudflare API credentials available to a process; values were never printed or persisted. Redacted API inventory **PASS**: the existing tunnel/DNS inventory was readable, and the dedicated public route remained mapped to its retained named tunnel. No create, DNS update, route update, login, delete, or Cloudflare control-plane mutation was invoked.
- Created a unique format-3 disposable board, fixture ticket, private token file through the shipped `remote-token-cli`, and owner-lock path outside the source/board worktrees. No bearer, credential content, tunnel id, endpoint, account data, or canary content was retained.

### Canonical current-main adapter attempts

| Attempt | Outcome | Evidence |
|---|---|---|
| A1 | **FAIL — setup reference** | `remote-cli` rejected the initial executable reference with `TUNNEL_EXECUTABLE_INVALID` before a provider connection. The actual executable path was corrected; no provider resource changed. A Node runtime assertion emitted after this failed child is retained as an observability anomaly, not attributed to source behaviour. |
| A2 | **INCONCLUSIVE — provider readiness** | With the corrected executable and retained named-tunnel credential reference, canonical `remote-cli` reported the local authenticated host **ready**, then failed its bounded adapter readiness with `TUNNEL_READINESS_TIMEOUT`. It never reported connected/ready public state. |
| A3 | **INCONCLUSIVE — provider readiness** | One permitted bounded retry, after A2's classified transient provider-readiness result: same local-authenticated-host **PASS**, same `TUNNEL_READINESS_TIMEOUT`, no connected public state. No deadline, polling policy, assertion, source code, or provider setting was changed. |

### Matrix results

- **Local authenticated HTTP origin: PASS.** Both corrected canonical attempts reached local `ready` only after their authenticated initialize/close check.
- **Named-tunnel adapter readiness: FAIL in A2/A3 (`TUNNEL_READINESS_TIMEOUT`); overall INCONCLUSIVE.** The real provider did not satisfy the current product's bounded readiness policy. This is not promoted to a source failure or a public-route pass.
- **Public Worker/official external client, concurrent clients/sessions, token rotation/revocation, host restart/session invalidation, degraded/recovery: INCONCLUSIVE / not attempted.** The canonical adapter never reached connected state, so no public session existed to rotate, revoke, concurrently exercise, or recover. A manual connector, longer deadline, direct provider mutation, or synthetic substitute was deliberately not used.
- **Secure cleanup: PASS.** Both remote parent processes and their exact child sets were gone; the owner lock was absent. The disposable board, tokens, runtime logs/configuration, and clean source clone were removed. Post-cleanup redacted Cloudflare inventory matched the pre-run shape (same retained tunnel/DNS counts and route binding). No retained named route, connector, credential, DNS record, or account resource was deleted or modified.

### Disposition

Overall **INCONCLUSIVE**. Preserve the two factual `TUNNEL_READINESS_TIMEOUT` failures and do not infer rotation/recovery/concurrency/public-client success from local readiness. A future protected run requires the canonical adapter to become connected under the unchanged current-main policy before those dependent checks can be attempted.
