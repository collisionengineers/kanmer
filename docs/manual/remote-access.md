Remote access lets one Kanmer project be reached through an HTTPS MCP endpoint when you are away from the desktop. It is opt-in: the normal local board remains the source of truth, and remote requests still use the same ticket, document, dependency, review, and proof rules. The endpoint is not a general web server and it does not turn Kanmer into a shared multi-user service.

## Remote access

The endpoint is a Streamable HTTP MCP endpoint ending in `/mcp`. Every request needs a Kanmer bearer token in the `Authorization` header. Use HTTPS for any public endpoint. A running endpoint belongs to one project identity and one process; do not infer the project from a hostname. The desktop and a headless process are separate owners, so stop one before asking the other to take over the same local resources.

## Security model

The bearer is an application credential in addition to any controls provided by a tunnel service. It is created and stored through protected operating-system storage or a protected token file, shown once, and never placed in a project file, URL, command argument, or diagnostic. Rotation invalidates active sessions. There is no per-user identity in this release: anyone holding the token has the same Kanmer permissions, subject to the board's normal workflow gates.

## Prerequisites

Have a project open in Kanmer, a stable HTTPS hostname, an operator-managed named tunnel, its protected credential reference, and a supported tunnel executable installed separately. The executable and tunnel resources are outside Kanmer's ownership. The project must have a valid board and repo identity. A public route is not considered verified merely because the local listener started.

## Architecture and terms

The local HTTP host authenticates and speaks MCP. A tunnel adapter forwards one exact loopback origin to a provider endpoint. The public endpoint is the HTTPS URL a client uses. “Connected” means the local host and adapter are healthy; “verified” means a public doctor run has confirmed DNS, TLS, route, authentication, project identity, tool policy, and session close. A failed or old public result is shown as stale. The project fingerprint is the stable identity used to prevent cross-project use.

## GUI setup

Open Settings → Connect and select the project. In the Cloudflare Tunnel section, use the fields “cloudflared executable”, “Tunnel id”, “Credentials file”, and “Public hostname”. Check “Enable this project’s Cloudflare remote access” and, if desired, “Start this project automatically when Kanmer opens”; choose “Save configuration”. Registered projects show State, Action, Severity, Board, Listener, Auth, Tunnel, and Remote health. The selected project exposes “Create token”, “Rotate token”, “Start”, “Stop”, “Run doctor”, “Reconcile identity”, and “Remove”.

Create a token only after saving a valid executable. The one-time dialog is masked by default; “Reveal” and “Copy and dismiss” are available, and the token expires after a short delivery window. Copy it into the external MCP client's secret store. It is not displayed again. “Rotate token” is disabled while the tunnel is active and invalidates older sessions. “Reconcile identity” is the safe recovery when a project folder moved; “Remove” asks for confirmation and removes the project's remote configuration and encrypted bearer.

## Headless setup

The installed package provides `kanmer-mcp-token <token-file>` for exclusive protected-file creation and `kanmer-doctor config|local|public [--json]`. `kanmer-mcp-remote` takes no positional arguments. It reads protected references from `KANMER_TUNNEL_PROVIDER=cloudflared`, `KANMER_HTTP_TOKEN_FILE`, `KANMER_TUNNEL_HOSTNAME`, `KANMER_CLOUDFLARED_EXECUTABLE`, `KANMER_CLOUDFLARED_TUNNEL_ID`, and `KANMER_CLOUDFLARED_CREDENTIALS_FILE`. It starts the authenticated loopback host, performs local verification, then starts the adapter and emits redacted readiness/status lines. Stop it with the normal process signal and confirm the child and listener have closed.

## Configure a remote MCP client

Give the client the HTTPS endpoint ending in `/mcp` and store the bearer separately. Send `Authorization: Bearer <token>` on every request. Never put the token in a query string, URL fragment, cookie, source file, or shell history. Use the client’s ordinary Streamable HTTP MCP transport; client-specific configuration syntax varies and is intentionally not prescribed here.

## Start, stop and auto-start

Use Start only after a token exists. The status surface distinguishes disabled, starting, ready, degraded, and stopped states, with local, tunnel, and public dimensions. Stop closes the authenticated listener before stopping the owned tunnel process. Auto-start is per project and is bounded and deterministic; one project's failure does not prevent other registered projects from being shown. A true Kanmer quit releases desktop ownership. Headless ownership remains separate and must be stopped explicitly.

## Run connector doctor

Run doctor in `config`, `local`, or `public` mode. The report is schema version 1 and contains ordered checks with pass, warn, fail, or skipped status, severity, safe details, and an optional repair. A prerequisite failure causes dependent checks to be skipped rather than run blindly. Exit 0 means the selected checks are healthy, exit 1 means a check found a problem, and exit 2 means the check could not complete. JSON and human output carry the same safe facts.

## Rotate or recover a token

If a token may have leaked, rotate it immediately and replace it in the client. Existing sessions are invalidated, so reconnect after rotation. If the one-time delivery expires before copying, create or rotate again. Do not search project files or logs for a token. If the desktop no longer recognises a moved project, use Reconcile identity and verify the displayed fingerprint before starting it.

## Move or remove a project

Project registration is keyed by the project fingerprint, not by a hostname. Move the project through the normal project picker, inspect the fingerprint, and reconcile the registration. Remove only when the project should no longer expose remote access; the confirmation removes its encrypted bearer and saved Cloudflare references. Removing a registration does not delete provider accounts, DNS, tunnels, credentials, or executables.

## Security and limitations

The current provider path is a locally managed named Cloudflare Tunnel plus mandatory Kanmer bearer authentication. Kanmer does not create accounts or DNS, provision tunnel resources, download executables, use Access as a replacement for the bearer, support Quick Tunnels as production infrastructure, accept remote-managed tunnel tokens, host Kanmer in a Worker, offer OAuth or per-user identity, expose background dispatch remotely, or provide an always-on service. A disposable Worker is an external client proof only; public success is downstream evidence and must not be inferred from local readiness. Never bypass TLS validation, bind broadly, share raw logs, force ownership, or retry an unsafe configuration blindly.
