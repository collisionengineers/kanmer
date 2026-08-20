# Kanmer ChatGPT tunnel

Kanmer's private MCP server can be exposed to ChatGPT through OpenAI's Secure MCP
Tunnel. The tunnel is outbound-only: `tunnel-client` polls OpenAI, starts the local
Kanmer MCP server over stdio, and returns MCP responses through the hosted tunnel.

## Credential handling

The runtime API key is stored in this project's Infisical workspace as:

```text
kanmer_chatgpt_tunnel_api_key
```

Do not copy the value into this repository, a `.env` file, the tunnel profile, or a
persistent user/machine environment variable. The reusable `scripts/chatgpt-tunnel.ps1` runs
itself under `infisical run`, then maps the injected secret to the
`CONTROL_PLANE_API_KEY` name required by `tunnel-client`. Both variables exist only
in the launcher process and its tunnel-client child; closing the process removes
them. The calling PowerShell session is unchanged.

Kanmer's npm commands pass `-ElectronAsNode`, which sets `ELECTRON_RUN_AS_NODE=1` in that child process. The installed
Kanmer executable supplies the Node runtime for the packaged MCP bundle; without
this flag Electron starts as a desktop application and the tunnel shuts down when
its stdio MCP command exits.

Infisical authentication must still be valid on the host. For an unattended service,
configure an Infisical machine identity or service token for the service account
instead of relying on a developer's interactive login.

## Prerequisites

1. Install and authenticate the Infisical CLI.
2. Keep the repository's `.infisical.json` project configuration present.
3. Download the current `tunnel-client` from OpenAI. Put it on `PATH`, set
   `TUNNEL_CLIENT_PATH`, or leave it under `Downloads` for the launcher to discover.
4. Create the `kanmer-local` tunnel-client profile. It must identify the Kanmer
   tunnel, listen on `127.0.0.1:8080`, and run the packaged MCP server with:

   ```text
   --root C:/Users/Alex/Documents/GitHub/kanmer/.worktrees/kanmer
   --repo-root C:/Users/Alex/Documents/GitHub/kanmer
   ```

The profile should continue to use `api_key: env:CONTROL_PLANE_API_KEY`; the launcher
supplies that variable securely at process start.

## Operation

From the repository root:

```powershell
npm run tunnel:doctor
npm run tunnel:start
```

Keep the second command running. In another terminal, check readiness with:

```powershell
npm run tunnel:status
```

The local operator UI is available at <http://127.0.0.1:8080/ui>. A successful
`doctor` validates configuration and control-plane access; `status` proves the local
daemon is ready. If ChatGPT still reports no connector, confirm the tunnel is linked
to the intended ChatGPT workspace and that the user has Tunnels Read + Use.

## Reuse across repositories

The launcher accepts one repository selector and derives the rest by convention:

- `-RepoName example` uses tunnel-client profile `example-local`.
- It reads Infisical secret `example_chatgpt_tunnel_api_key`.
- It uses the `.infisical.json` belonging to the repository containing the script.
- The tunnel-client profile remains the source of truth for the tunnel ID and MCP target.

Example from another initialized repository:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/chatgpt-tunnel.ps1 doctor -RepoName example
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/chatgpt-tunnel.ps1 run -RepoName example
```

Each repository therefore needs its own `<repo>-local` profile and
`<repo>_chatgpt_tunnel_api_key` Infisical entry. Use a distinct health port in each profile
if several tunnels will run concurrently; the current launcher status check assumes port
8080.

## Failure modes

- **Infisical secret missing:** confirm the exact secret name and selected Infisical
  project/environment.
- **Infisical authentication expired:** run `infisical login`, or repair the machine
  identity used by the service.
- **Tunnel client missing:** install it, add it to `PATH`, or set
  `TUNNEL_CLIENT_PATH` for the launcher process.
- **Connector response 404 / no connector:** confirm `npm run tunnel:status` passes,
  then run `npm run tunnel:doctor` and verify the workspace association in OpenAI.
- **Port 8080 already in use:** stop the conflicting process or update both the
  tunnel profile and `$healthUrl` in the launcher.

Official reference: [OpenAI Secure MCP Tunnel documentation](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels).
