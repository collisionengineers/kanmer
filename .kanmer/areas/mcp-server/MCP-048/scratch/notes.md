## 2026-08-24 real-provider diagnosis

A controlled disposable named-tunnel test reached local metrics readiness only after Cloudflare edge connections arrived later than the adapter's current startup window. The first HTTP/2 connection attempt timed out, the provider's own connectivity pre-check reported transient UDP/TCP failures, then all four HTTP/2 edge connections registered and `/ready` returned HTTP 200. The same generated ingress validated when the loopback service omitted `/mcp`; public `/mcp` path preservation was confirmed separately.

This is evidence of a timing/readiness-policy defect or insufficiently robust test window, not grounds to weaken the timeout assertion or treat a timeout as success. No provider credential, bearer, tunnel id, hostname, or account data is retained. The test connector, local host, Worker client, token/runtime files, and disposable board were torn down; only the intended operator-managed named tunnel/DNS route remains.
