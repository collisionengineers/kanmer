# Files — MCP-049

## Where the change lands

| Path | Why |
|---|---|
| `%APPDATA%/tunnel-client/<canonical-profile>.yaml` | Replace stale temporary MCP roots with the real board/repository and stable installed launcher; retain only environment secret references. Operational file, never committed. |
| tunnel-client native runtime state under the user profile | Create one managed alias and record healthy/ready status through the product’s supervisor. Operational state, never committed. |
| `%APPDATA%/@kanmer/gui/settings.json` plus the OS-protected Kanmer secret backend | Configure the shipped Cloudflare manager for this project and enable autostart without storing bearer material in repository data. Managed through Kanmer, not hand-edited. |
| `docs/manual/connect.md` | Only if execution proves the generic OpenAI instructions still point at a version-coupled runtime after GUI-133; update the public runbook to the stable launcher without including project-specific values. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `apps/gui/src/main/remoteAccess/manager.ts` | The production Cloudflare lifecycle already owns secret delivery, doctor, process supervision, dynamic local endpoint allocation, cleanup, and autostart. Do not duplicate it. |
| `apps/gui/src/main/remoteAccess/configStore.ts` | Persisted config deliberately contains only references and rejects malformed provider state. |
| `packages/mcp-server/src/remote-cli.ts` | Defines the environment contract the GUI manager launches for provider-neutral HTTP MCP. |
| `packages/mcp-server/src/tunnels/cloudflared.ts` | Generates a temporary local config, validates executable/credentials/ingress, and supervises the connector; remote dashboard ingress is not the production caller. |
| `docs/functional/frd/FRD-025-remote-access.md` | Governs mandatory bearer auth, loopback-only origin, exact hostname, and provider-neutral adapter boundaries. |
| `docs/manual/connect.md` | Documents the OpenAI tunnel’s separate runtime-key and supervision boundary and warns that its bundled cloudflared is not a provider-neutral public URL. |
| `docs/manual/providers/cloudflared.md` | Requires operator-provisioned locally managed credentials while Kanmer owns runtime start/health/stop. |

## Ripple effects

- Starting the OpenAI runtime creates a long-lived outbound process and loopback health UI; it does not expose an inbound listener publicly.
- Starting Kanmer’s Cloudflare remote mode creates a loopback HTTP MCP origin, generated bearer, temporary config, and one owned connector; public doctor must test DNS/TLS/auth/MCP and cleanup behavior.
- A Kanmer update must preserve/restart both supervisors. GUI-133 covers stable runtime replacement; this ticket must prove actual restart behavior rather than add compatibility layers.
- If the generic runbook changes, regenerate the manual mirror and run its freshness/tests.

## Out of scope

- Creating another tunnel, DNS record, Worker, proxy, transport, or authentication scheme.
- Reusing OpenAI’s bundled cloudflared as the public provider-neutral route.
- Committing secrets, tunnel ids, provider account data, generated bearers, credential files, or machine-specific paths.
- Modifying unrelated healthy Cloudflare connectors or old release assets.
