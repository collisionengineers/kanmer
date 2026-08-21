# Plan — GUI-104: Manage OpenAI Secure MCP Tunnel profiles in the GUI

## Approach

Add a dedicated OpenAI Secure MCP Tunnel service in the Electron main process and a separate Settings surface. It will wrap the externally installed `tunnel-client` CLI, reuse Kanmer's canonical packaged stdio invocation, persist only non-secret per-project metadata, and supervise only processes Kanmer starts. It will not enter the provider registry or the Cloudflare/Streamable-HTTP adapter contract.

## Governing docs

No governing repository document is currently linked; `docs_todo: true` correctly records that gap. Before implementation, use `kanmer-docs` with explicit approval to define the GUI-owned profile/process lifecycle, environment-reference credential rule, per-project isolation, and update/quit behavior. FRD-012 and FRD-024 are likely affected context, while EPIC-010 remains the boundary contract. This plan does not itself authorize modifying them.

## Steps

1. Complete and link the governing document, then clear `docs_todo`; do not begin source changes first.
2. Define typed IPC models for non-secret profile configuration and lifecycle status: project identity, profile name, tunnel id, executable path, health address, state, redacted diagnosis, and last error.
3. Add app-global persistence keyed by canonical project root. Reject duplicate profile names/health addresses and never accept or serialize an API-key value; launches require the configured environment-variable name to be present in the main process environment.
4. Build the main-process tunnel service around argument-array process spawning: generate the canonical stdio command from the existing invocation helper, normalize Windows command paths as DOC-010 requires, run `init`/doctor, start `run`, stream redacted status, and stop only owned process trees.
5. Integrate service status and cleanup into main IPC, application quit, project close, and Kanmer update handling. A stopped or replaced packaged MCP binary must surface a restart-required state.
6. Add an OpenAI Secure MCP Tunnel section in Settings with prerequisite checks, profile create/edit, doctor, start, stop, restart, and explicit external ChatGPT workspace/app steps.
7. Update the manual and regenerate its committed output.
8. Prove two distinct project profiles run concurrently with distinct health ports, select the intended boards, survive UI refresh/restart expectations, and leak no tunnel id/API key into logs or repository state.

## Verification

Unit-test configuration validation, canonical command construction, Windows slash handling, redaction, duplicate port/profile rejection, owned-process cleanup, missing executable/env key, doctor failures, and update/quit transitions. Run GUI tests, root typecheck, build, manual check, packaged smoke, and a real two-project tunnel-client integration with redacted proof.

## Risks / open questions

- External tunnel-client and ChatGPT beta behavior may change. Keep CLI-specific logic isolated and report the detected client version.
- A governing-document approval is required before implementation; this remains the only intentional hold.
