# Research — GUI-104: OpenAI Secure MCP Tunnel profile lifecycle

## Question

How can the GUI supervise OpenAI Secure MCP Tunnel profiles per project without merging that path into the Cloudflare HTTP adapter or leaking credentials?

## Findings

- DOC-010 and `docs/manual/connect.md` document a tested `tunnel-client` 0.0.11 flow: `init`, `doctor --explain`, and `run` launch Kanmer's packaged stdio MCP command; the profile references `env:CONTROL_PLANE_API_KEY` rather than storing the key.
- The OpenAI path uses an OpenAI tunnel id/control plane and is not a provider-neutral URL or an implementation of Kanmer's Streamable HTTP adapter contract.
- Each project needs its own tunnel id, profile name, ChatGPT app, board root, and repo root. Concurrent profiles also need distinct loopback health addresses because the client defaults collide.
- Current GUI Connect code manages local agent-host registrations only. It has no tunnel profile schema, IPC contract, process supervisor, health model, or settings surface.
- Existing main-process background dispatch demonstrates owned-child lifecycle, status events, cancellation, and quit cleanup; it can supply patterns but its task semantics and logs must not be reused as a tunnel model.
- Project paths can be persisted, but the runtime API key must never be accepted into renderer state, project files, app settings, logs, ticket documents, or diagnostics. The child should inherit only a named environment reference already present in the launch environment.
- OpenAI's current official guidance still directs private/local MCP servers to Secure MCP Tunnel and notes that full MCP write support and developer-mode permissions remain workspace-controlled beta functionality. The GUI must report those external prerequisites rather than claim to provision them.
- GUI-104 has `docs_todo: true`; no governing repo document currently specifies this new GUI-owned process and profile lifecycle.

## Implications

Add a distinct OpenAI Tunnel section and main-process service, not another provider entry and not a tunnel-adapter implementation. Persist only non-secret per-project metadata in app-global settings, validate executable/profile/port ownership, supervise only children Kanmer starts, and require governing documentation before implementation.

## Open questions

The governing-document gap is tracked by `docs_todo`; authoring/approval belongs to `kanmer-docs` before execution.
