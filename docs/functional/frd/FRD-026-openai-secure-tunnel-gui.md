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
- **R3 — Canonical target.** `init` uses the existing packaged Electron-as-Node
  stdio invocation with the selected board root and optional repository root.
  Windows command paths use forward slashes for the tunnel client's parser.
- **R4 — Owned lifecycle.** Kanmer may run `init`, `doctor`, `run`, stop and
  restart only for children it spawned. Stop and quit cleanup terminate the
  owned process tree; externally started tunnel clients are never scavenged.
- **R5 — Honest health.** Missing executable, missing named environment
  variable, doctor failure, child exit and update replacement are surfaced as
  bounded status/diagnostic states. The GUI does not claim ChatGPT workspace,
  app, tunnel provisioning or control-plane success without external proof.
  The configured loopback health address is validated and displayed as an
  operator expectation; because `tunnel-client` owns its profile file, the GUI
  does not rewrite `health.listen_addr` or claim a live listener unless a
  future documented client probe is added.
- **R6 — Update and quit.** A running profile is stopped before application
  quit. An update that replaces the packaged MCP target marks the profile
  restart-required rather than silently reconnecting to an unknown binary.
- **R7 — GUI contract.** Settings exposes profile registration, validation,
  doctor, start, stop and restart actions with redacted status. No OpenAI
  profile is represented in the Cloudflare remote-access provider registry.

## Verification boundary

Deterministic tests prove validation, command construction, redaction,
duplicate isolation, child ownership and quit/update transitions. The
two-project health/listener and OpenAI control-plane run remain external
acceptance checks and are reported `INCONCLUSIVE` when no runtime credential,
disposable projects, and documented listener probe are available.

Related: [[GUI-104]] · [[DOC-010]] · FRD-022 · FRD-025.
