# Files — DOC-017

## Where the change lands

| Path | Why |
|---|---|
| `MASTERPLAN.md` | Replace stale remote-access summaries with the approved Cloudflare tunnel/client roles, explicit exclusions, and the current MCP-028 proof environment. |
| Kanmer group document `EPIC-010/context.md` | Confirm the shared approval contract remains the canonical wording; change it only if the roadmap audit exposes a mismatch. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `docs/functional/frd/FRD-025-remote-access.md` | Defines the application transport, bearer-auth, project-isolation, adapter, and threat-model boundaries. |
| `docs/architecture/adr/ADR-0017-streamable-http-remote-access.md` | Establishes Streamable HTTP as the remote transport while stdio remains the local/default and OpenAI tunnel path. |
| `docs/manual/connect.md` | Records the independent OpenAI Secure MCP Tunnel workflow and its security constraints. |
| `EPIC-010/context.md` | The approval contract binding every remote-access ticket. |

## Ripple effects

Roadmap readers, dependent ticket scopes, and future grooming use these statements. No source code, generated manual, provider configuration, or Cloudflare resource changes should follow.

## Out of scope

Changing FRD-025 or ADR-0017; provisioning Cloudflare; adding Access, Quick Tunnels, hosted Workers, OAuth, or public relay behavior; changing DOC-010's OpenAI workflow.
