# Plan — DOC-010: Document and validate secure remote Kanmer access

## Approach

Keep the OpenAI tunnel outside Kanmer and target the already-packaged stdio server. Add one focused manual section plus a README pointer, initialize and statically validate the supplied client profile, and document evidence from the client package and Kanmer store. This avoids an unnecessary HTTP server, credential handling, bundled daemon, or provider-specific code.

## Governing docs

- **FRD-022 MCP server surface — Meets:** use the existing stdio surface unchanged, document remote tool discovery and direct store behavior, and retain host-agnostic MCP semantics.
- **FRD-024 in-app manual — Meets:** place task-oriented remote connection guidance in the Connect chapter and make it discoverable from README.

## Steps

1. Initialize a named tunnel-client profile using the supplied tunnel ID, installed Kanmer runtime, packaged MCP bundle, canonical board root, and source root; capture only sanitized configuration and Cloudflare provenance.
2. Add a Secure MCP Tunnel section to the Connect manual with prerequisites, PowerShell setup/run commands, ChatGPT app instructions, security/lifecycle warnings, direct Markdown behavior, and provider-portability details.
3. Add a concise README pointer to the manual section.
4. Validate documentation commands and local MCP behavior without secrets; run live doctor/runtime tests if a runtime API key is available.
5. Record exact findings, validation limits, and follow-up requirements in the post-implementation report.

## Verification

Check generated profile structure without exposing credentials; exercise the packaged MCP server over stdio; verify source documentation links; run relevant documentation/build checks. Live OpenAI readiness is conditional on an out-of-band runtime API key.

## Risks / open questions

- The OpenAI client profile is user-global operational state; keep it out of git and redact token paths/content.
- A bundled Cloudflare binary could be mistaken for a generic endpoint. State the distinction explicitly and support it with version, configuration, process, and control-plane evidence.
- The installed MCP binary may be interrupted by a Kanmer update; document that the tunnel runtime must be restarted afterward.
