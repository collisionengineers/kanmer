Checkpoint `d01a1f6`: added `KanmerRemoteHost.invalidateOrigin()` for the owning project/auth lifecycle. It stops tunnel forwarding, reports static `TUNNEL_ORIGIN_INVALIDATED`, and deliberately leaves the authenticated local HTTP service available for investigation or recreation; focused HTTP suite 28/28, MCP typecheck, and scoped diff check pass. Automatic wiring to concrete project/auth observers remains unfinished.

Commits `883da82` and `ade71f3`: register the owned child-exit listener before waiting for spawn/readiness (so early exit cannot hang an attempt) and share one idempotent stop promise. Added regression for child exit while readiness is pending and concurrent-stop cleanup. Focused HTTP/adapter suite 29/29, MCP typecheck, and diff check pass.

Broader regression checkpoint after the current lifecycle changes: built fake-provider remote smoke passed (no public route), raw stdio protocol smoke passed 30/30 with unchanged 30-tool surface, and discovery smoke passed 13/13. The ticket remains Implementing because contract validation, complete restart wiring, and remaining integration coverage are still incomplete.

Commit `fc68a60` passes the bearer verifier's non-secret `sha256:<12hex>` fingerprint as tunnel auth-generation metadata and rejects arbitrary values before the provider starts, so a caller cannot accidentally route a bearer string through the adapter boundary. Focused suite now 30/30; MCP typecheck and diff check pass.

Commit `f99308d` makes the provider-neutral `TunnelStartInput` executable: unknown discriminator fields/modes, unsafe non-loopback target URLs, and invalid bounded restart policies fail before Cloudflared can spawn. Tests now cover accepted input plus mode/origin/policy rejection; focused suite 31/31 and MCP typecheck pass.

Commit `47b32c3` switches tunnel credential validation to `lstat`, rejecting symlinked paths before a provider starts. The focused MCP suite remains 31/31 with typecheck and diff check clean.
