# Post-implementation report

Implemented the Windows ChatGPT tunnel path against tunnel-client 0.0.11's supported managed-runtime interface. The GUI now creates/reuses a per-project runtime through `runtimes connect`, proves readiness from `runtimes status <alias> --json`, stops/removes only that local alias, and leaves persistent runtimes running when Kanmer closes. The app no longer invokes obsolete `init` or owns a `run` child.

FRD-026, Settings copy, and the in-app manual now describe the same lifecycle and explicitly direct ChatGPT users to the discovered Tunnel app rather than Custom Connector OAuth. The key remains an environment-variable reference and never enters settings or diagnostics.

Production caller: the existing OpenAI tunnel IPC handlers in `apps/gui/src/main/index.ts` call `OpenAITunnelManager`; Settings invokes those handlers through the existing preload bridge.

Verification:

- Focused OpenAI main/renderer tests: 15/15 PASS.
- GUI typecheck: PASS.
- `npm run verify`: PASS after `npm ci` installed the worktree's locked MCPB development CLI. The initial aggregate attempt reached all product tests but stopped at MCPB packaging with `MODULE_NOT_FOUND`; that environmental attempt is not erased by the later pass.
- Full pass includes core 310/310, GUI 477/477, MCP HTTP 107/107, scripts 116/116, protocol, docs, MCPB, headless smoke, typecheck, AGENTS block and plugin sync.

Commit: cd29bec5. Packaged/live ChatGPT proof remains a post-merge verification requirement; this report does not claim control-plane success.
