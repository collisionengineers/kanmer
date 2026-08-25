# Post-implementation report

Implemented the Windows ChatGPT tunnel path against tunnel-client 0.0.11's supported managed-runtime interface. Runtime aliases and tunnel-client profile names are separate, both are unique per canonical project, and the real `kanmer-board` alias can use its separately named client profile. The GUI uses `runtimes connect/status/stop/rm`, proves structured readiness, and never owns a long-lived `run` child.

Lifecycle corrections are fail-closed: disabling stops and confirms the persistent alias before saving; reconnect aborts after a failed or unconfirmed stop; identity reconciliation stops, confirms, and removes the old local alias before transferring metadata to new roots; and removal permits local unregister only for the client's exact alias-not-known response. Status remains usable without the connect credential, which is reported as a warning for an already-running runtime. FRD-026, Settings, and the generated manual describe the same Windows lifecycle and direct ChatGPT users to the discovered Tunnel app rather than Custom Connector OAuth.

Production caller: OpenAI tunnel IPC handlers in `apps/gui/src/main/index.ts` call `OpenAITunnelManager`; Settings invokes them through the existing preload bridge.

Verification:

- Focused OpenAI main/renderer tests: 21/21 PASS.
- GUI typecheck: PASS.
- `npm run plugin:check`: PASS (37 tools, exact bundle bytes, 12 skill frontmatters, isolated handshake).
- `git diff --check`: PASS.
- The preceding full `npm run verify` attempt passed core 310/310, GUI 481/481, MCP HTTP 107/107, scripts 116/116, protocol, docs, MCPB, headless smoke, typecheck and AGENTS verification, then exposed the stale packaged instruction mirror. That mirror was rebuilt and plugin sync passed. A fresh exact-head full run and hosted CI are required before merge.
- No Ubuntu workflow or CI lane was added or modified.

Commits: cd29bec5, 44d35076, 6c7ed4ec, b2801866, 18c1b269. Packaged/live ChatGPT proof remains a post-merge verification requirement; this report does not claim control-plane success.
