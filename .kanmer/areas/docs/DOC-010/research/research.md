# Research — DOC-010: secure remote Kanmer access

## Question

Can OpenAI Secure MCP Tunnel expose Kanmer's existing local stdio server safely, how do remote agents mutate tickets, and does the bundled Cloudflare component make the connection portable to other providers?

## Findings

- OpenAI's Secure MCP Tunnel supports a private MCP target over stdio via `--mcp-command`; it polls the OpenAI control plane outbound on HTTPS and requires no inbound listener (OpenAI Secure MCP Tunnel guide, inspected 2026-08-18).
- The supplied package contains `tunnel-client.exe`, `cloudflared.exe`, and `cloudflared-manifest.json`. The manifest pins cloudflared 2026.7.2, upstream commit `8679787525edc8575b2948a7c4a50b6292c6d426`, and assigns security updates to the tunnel-client maintainers.
- `tunnel-client help` identifies the program as an OpenAI MCP control-plane client. Its bundled cloudflared command only exposes provenance and a token-free config generator; config generation requires a generated `--token-file`. This is a managed transport companion, not a provider-neutral endpoint.
- Kanmer's MCP handlers route `create_item`, `update_item`, `move_item`, and `set_ticket_doc` directly to `KanmerStore` (packages/mcp-server/src/index.ts).
- `KanmerStore` exclusively creates ticket files, atomically rewrites serialized Markdown/frontmatter, enforces gates before status changes, atomically writes document Markdown, and appends derived activity entries (packages/core/src/store.ts).
- The installed Kanmer runtime and MCP bundle exist at the expected paths. The canonical board worktree and source root also exist.
- No `CONTROL_PLANE_API_KEY` is present in the current process environment, so live OpenAI control-plane validation cannot yet run.
- ChatGPT receives MCP tool schemas/descriptions, but not the locally installed Kanmer skills. Remote use therefore needs a compact app instruction block covering orientation, gates, document writes, and archive-over-delete.

## Implications

The implementation needs documentation and an operator-run tunnel profile, not a new transport or store implementation. Provider portability must be reported as “reusable Cloudflare component, OpenAI-specific tunnel”: another provider can use Kanmer only through its own stdio bridge/tunnel, or through a separately designed authenticated HTTP MCP endpoint.

## Open questions

None affecting the documented implementation. Live doctor/run testing requires the runtime API key to be supplied out of band.
