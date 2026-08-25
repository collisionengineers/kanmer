---
id: FRD-026
title: OpenAI Secure MCP Tunnel GUI lifecycle
status: accepted
---

# FRD-026 — OpenAI Secure MCP Tunnel GUI lifecycle

## Boundary

The desktop GUI may supervise an externally installed OpenAI `tunnel-client`
that launches Kanmer's existing local stdio MCP server. This is a separate
OpenAI-managed path. It is not a provider registration, a Cloudflare
`cloudflared` adapter, a Streamable HTTP endpoint, a public relay, or a tunnel
provisioning API.

## Requirements

- **R1 — Project isolation.** A profile belongs to one canonical project
  identity (board root, source root and format). The GUI must not combine
  boards behind one profile and must reject duplicate profile names or loopback
  health addresses across projects.
- **R2 — Non-secret persistence.** App-global settings may persist the profile
  name, tunnel identifier, executable path, named credential environment
  variable and loopback health address. API-key values, tunnel-client profile
  files and credentials never enter project files, Kanmer documents, logs,
  diagnostics or renderer state.
- **R3 — Canonical target.** `runtimes connect` uses the existing packaged Electron-as-Node
  stdio invocation with the selected board root and optional repository root.
  Windows command paths use forward slashes for the tunnel client's parser.
- **R4 — Managed lifecycle.** Kanmer manages one tunnel-client runtime alias per
  canonical project through `runtimes connect`, `runtimes status`, `runtimes
  stop`, and `runtimes rm`. The runtime is not a GUI-owned child: app/project
  close leaves it running. Stop and remove target only that alias, and remove
  never deletes the remote tunnel.
- **R5 — Honest health.** Missing executable, missing named environment
  variable, command failure, malformed status and update replacement are surfaced as
  bounded status/diagnostic states. The GUI does not claim ChatGPT workspace,
  app, tunnel provisioning or control-plane success without external proof.
  Ready is claimed only when structured runtime status reports `process_running`,
  `healthy`, and `ready` true with `runtime_state: ready`.
- **R6 — Update and quit.** Application quit does not stop managed runtimes. An
  update that replaces the packaged MCP target marks a ready runtime
  reconnect-required rather than killing it or silently claiming the new
  binary is active.
- **R7 — GUI contract.** Settings exposes profile registration, connect/status,
  stop, reconnect and remove actions with redacted status. It explains that
  ChatGPT uses its discovered Tunnel app, not the Custom Connector OAuth form. No OpenAI
  profile is represented in the Cloudflare remote-access provider registry.

## Verification boundary

Deterministic tests prove validation, exact managed-runtime command construction,
structured readiness parsing, redaction, duplicate isolation and quit/update
transitions. The two-project and OpenAI control-plane run remain external
acceptance checks and are reported `INCONCLUSIVE` when no runtime credential,
disposable projects, and documented listener probe are available.

Related: [[GUI-104]] · [[DOC-010]] · FRD-022 · FRD-025.
