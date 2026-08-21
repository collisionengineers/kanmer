# Open questions — MCP-021

## Resolved decisions

- **What does the adapter publish?** Only an already healthy, bearer-authenticated loopback MCP origin bound to one immutable project.
- **Does the adapter receive the Kanmer bearer token?** No. It receives only origin URL plus non-secret readiness/project/auth-generation metadata.
- **First provider?** `cloudflared`, behind one provider-neutral adapter/handle/status interface.
- **First production mode?** An operator-provisioned named Cloudflare Tunnel with a stable configured HTTPS hostname and protected credential reference.
- **Are Quick Tunnels supported?** Not as production remote MCP access. Omit them in v1; at most a separately labelled non-persistent developer diagnostic may be considered later because official limitations conflict with reliable streaming use.
- **Does Kanmer create the Cloudflare account/tunnel/DNS record?** No. The operator/provider setup owns those resources; Kanmer validates and runs the local connector.
- **Which named-tunnel credential mode?** Prefer locally managed credentials plus generated runtime ingress. A remotely managed token mode may be added only as a separate exact discriminator using a current official secret-file mechanism, never a raw argument.
- **Where is provider config generated?** In a protected app runtime/temp directory outside repository and board worktrees, using safe serialization and removed on stop/failure.
- **What ingress is allowed?** One exact validated public hostname to one exact loopback Kanmer origin, followed by a terminal `http_status:404` catch-all.
- **How is readiness determined?** A documented loopback-only cloudflared readiness/metrics signal, not process existence or human prose. Public end-to-end verification remains MCP-027/MCP-028.
- **How is the public URL determined?** From the validated configured hostname, not scraped from logs.
- **Does this ticket download/update cloudflared?** No. It validates an explicit, approved bundled, or PATH executable and disables self-update. Packaging/download requires a separate approved decision.
- **How are arguments executed?** Direct executable plus argument array, `shell: false`, minimal environment, neutral cwd.
- **Where are Cloudflare credentials stored?** GUI/manual-selected protected provider credential file or secret reference. Contents never enter ordinary settings, runtime ingress, argv, logs, events, board docs, or MCP output.
- **How are logs handled?** Request structured logs where supported, map allowlisted fields into bounded redacted events, keep only a small in-memory ring buffer, and do not persist raw output by default.
- **Who restarts the tunnel?** The provider-neutral supervisor/remote orchestrator using bounded exponential backoff/jitter and attempt caps; intentional/configuration/security stops do not restart.
- **What are initial restart defaults?** Base 1 second, exponential to 30 seconds, ±20% jitter, five consecutive attempts, reset after five stable minutes; implementation may adjust only with recorded evidence and tests.
- **What if the local HTTP origin/project/auth generation changes?** Mark degraded and stop the tunnel; never continue forwarding to an unknown listener.
- **What if cloudflared dies?** Keep the authenticated loopback server local, report degraded/failed, and apply the bounded restart policy when the failure is transient.
- **How is shutdown performed?** Cancel restart/health polling, gracefully stop the owned child, bounded forced process-tree termination, release metrics/config/resources, verify no owned child remains.
- **Can tests use real Cloudflare credentials?** No in the normal rail. Use a fake executable; MCP-028 owns controlled real public integration.
- **Does this change stdio or the plugin?** No, except canonical regeneration only if an unavoidable shared-source change alters bytes.

## Deferred explicitly

- `[deferred]` Additional tunnel providers and provider account APIs.
- `[deferred]` Executable download/update/signature distribution policy.
- `[deferred]` Quick Tunnel developer mode.
- `[deferred]` Cloudflare Access identity as an application principal.
- `[deferred]` Managed relay, multi-board routing, Windows service installation.

No unresolved implementation questions remain.

## Resolved roadmap amendment — 2026-08-21

- **Cloudflare mode?** Locally managed named tunnel with a protected credential-file reference only.
- **Cloudflare Access?** Unsupported in this release; Kanmer bearer is the sole application authentication.
- **Worker role?** A disposable external MCP client in [[MCP-028]], never a hosted Kanmer service.
