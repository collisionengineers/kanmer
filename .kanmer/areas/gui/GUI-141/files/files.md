# Files

- `docs/functional/frd/FRD-026-openai-secure-tunnel-gui.md`: replace the obsolete owned `init`/`doctor`/`run` lifecycle with tunnel-client 0.0.11 managed runtime alias semantics.
- `apps/gui/src/main/openaiTunnel.ts`: build and execute `runtimes connect/status/stop/rm`; parse status JSON; do not own or kill the persistent runtime process.
- `apps/gui/src/shared/openaiTunnel.ts`, `apps/gui/src/shared/ipc.ts`, `apps/gui/src/main/index.ts`, and preload bridge: align status/actions and IPC with managed runtimes while preserving project identity and secret-reference boundaries.
- `apps/gui/src/renderer/src/components/Settings.tsx`: make ChatGPT setup explicit and remove obsolete Initialize/Run doctor/GUI-owned Start wording and behavior.
- OpenAI tunnel main/renderer tests and generated manual: update assertions and user instructions for the supported Windows runtime flow.
- Reuse the existing canonical packaged MCP invocation and per-project identity helpers; do not add a parallel server, OAuth, Cloudflare integration, Linux behavior, or dependencies.
