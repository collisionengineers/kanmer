# Checklist — MCP-047

- [x] Preserve strict validation of the loopback `/mcp` target.
- [x] Render a pathless loopback origin in generated Cloudflare ingress.
- [x] Update focused config tests for public endpoint versus provider origin.
- [x] Keep real-cloudflared validation as a manual protected check, not an environment-dependent committed test.
- [x] Clarify the path-preserving provider contract in the manual.
- [x] Run focused configuration and tunnel tests.
- [x] Run real cloudflared ingress validate and rule checks.
- [x] Run build and typecheck/regression commands appropriate to the changed package.
- [x] Record implementation results, known limits, and no-secret evidence.
- [ ] Open a PR; do not merge it.
