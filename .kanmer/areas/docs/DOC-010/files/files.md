# Files — DOC-010

## Where the change lands

| Path | Why |
|---|---|
| `docs/manual/connect.md` | Add the supported remote ChatGPT tunnel setup, exact Windows commands, operating instructions, security boundary, and provider-portability conclusion. |
| `README.md` | Add a short discoverable pointer from manual MCP connection guidance to the detailed tunnel instructions. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `packages/mcp-server/src/index.ts` | The tunnel targets stdio unchanged and remote calls reach the existing tool handlers. |
| `packages/core/src/store.ts` | Ticket and document mutations already write the Markdown store atomically and enforce gates. |
| `apps/gui/src/main/connect.ts` | The verified packaged Electron-as-Node invocation, including board/source roots. |
| `docs/functional/frd/FRD-022-mcp-server-surface.md` | The public MCP contract must remain unchanged and host-agnostic. |
| `docs/functional/frd/FRD-024-in-app-manual.md` | User-facing operational guidance belongs in the manual. |

## Ripple effects

The in-app manual consumes the committed manual chapter, so the guidance becomes available both in repository docs and the packaged documentation surface. No MCP bundle rebuild is required because no tool or server code changes.

## Out of scope

Bundling or supervising tunnel-client, accepting or storing API keys in Kanmer, creating a public Cloudflare endpoint, adding HTTP MCP transport, and implementing integrations for unspecified third-party providers.
