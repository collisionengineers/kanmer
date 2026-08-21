# Remote access — approval contract

## Outcome

Any remote MCP client can reach one local Kanmer board through the Streamable HTTP endpoint with Kanmer bearer authentication, via interchangeable tunnel adapters; health is diagnosable in one command.

## In scope

FRD/ADR, transport, bearer authentication, tunnel-adapter contract plus a locally managed named cloudflared tunnel, doctor, Cloudflare tunnel GUI lifecycle ([[GUI-095]]), provider-neutral documentation ([[DOC-013]]), and an end-to-end proof ([[MCP-028]]).

## Cloudflare roles in this release

- **Tunnel provider:** cloudflared maps one exact public HTTPS hostname to one authenticated loopback /mcp origin. Kanmer does not create Cloudflare accounts, tunnels, DNS records, Access policies, or install/update the executable.
- **Remote-provider proof:** a disposable Cloudflare Worker is an external MCP client for [[MCP-028]] only. It is not a hosted Kanmer MCP server, proxy, relay, or durable service.
- **Application authentication:** Kanmer bearer authentication is mandatory. Cloudflare Access is not supported or required in this release.
- **OpenAI path:** OpenAI Secure MCP Tunnel remains an independent, OpenAI-managed stdio path documented by [[DOC-010]]; it is not a cloudflared adapter.

## Out of scope

[[MCP-020]] dispatch-over-MCP (separate authorization boundary), OAuth, Cloudflare Access, multi-board single endpoints, Quick Tunnels, remote-managed Cloudflare token mode, account/DNS automation, and Cloudflare Workers-hosted Kanmer. A hosted Worker mode requires a separate approved ADR and ticket set.

## Risks

Secrets handling (no plaintext), loopback bind by default, per-project isolation, and accurately distinguishing tunnel, bearer, local-host, and remote-client failures.

## Done when

The integration ticket proves a Cloudflare named tunnel from a disposable remote Worker client through the bearer-authenticated /mcp endpoint, with a redacted doctor result and complete teardown.
