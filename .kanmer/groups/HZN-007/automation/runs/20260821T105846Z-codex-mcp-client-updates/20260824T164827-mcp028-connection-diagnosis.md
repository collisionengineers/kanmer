# MCP-028 canonical-tunnel connection diagnosis

Recorded: 2026-08-24T16:48:27.921Z

- The canonical DNS CNAME points to the retained named tunnel, whose local configuration has the expected hostname ingress rule.
- The dedicated Cloudflare connections API reports zero active connectors for that tunnel.
- A no-credential public request returns HTTP 530 with Cloudflare error 1033, the documented signal that no healthy connector can receive traffic.
- A distinct token-managed Windows service is running but is not a healthy connector for this route.
- No provider or source mutation was made. The prior two bounded canonical readiness attempts remain exhausted; no third retry was performed.
