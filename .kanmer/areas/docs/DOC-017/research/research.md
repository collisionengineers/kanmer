# Research — DOC-017: Cloudflare remote-access boundary

## Question

Which roadmap and governance statements must change so Cloudflare's two approved roles are unambiguous without altering the remote-access architecture?

## Findings

- `EPIC-010/context.md` already states the approved boundary: a locally managed named `cloudflared` tunnel publishes the bearer-authenticated loopback `/mcp` endpoint, while a disposable Cloudflare Worker is only MCP-028's external client.
- `MASTERPLAN.md` still describes the OpenAI/ChatGPT tunnel as an adapter within “one transport, N tunnels” and says final proof uses a second machine. Those statements lag the epic contract: OpenAI Secure MCP Tunnel is an independent OpenAI-managed stdio path, and MCP-028 now uses a disposable Worker client.
- `docs/functional/frd/FRD-025-remote-access.md` and `docs/architecture/adr/ADR-0017-streamable-http-remote-access.md` retain the intended architecture: one local Streamable HTTP transport, mandatory Kanmer bearer auth, loopback binding, and provider-specific tunnel adapters.
- The approved Cloudflare scope excludes account creation, DNS automation, Cloudflare Access, Quick Tunnels, remote-managed tunnel tokens, and Workers-hosted Kanmer. Provider credentials and executable lifecycle remain operator-owned.
- DOC-010's OpenAI path launches the existing stdio server and must remain separate from the Cloudflare HTTP adapter dependency graph.

## Implications

The implementation is a roadmap correction, not an architecture change. Update only stale roadmap wording, preserve the already-correct epic contract, and verify the FRD/ADR terminology still agrees. Any Access or Workers-hosted mode requires separate governance and tickets.

## Open questions

None.
