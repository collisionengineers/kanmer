## Antigravity Guidance from agy-customizations & antigravity-guide

### Background Dispatch CLI Interface for Antigravity (`agy`)
- **Model Flag**: Pass `--model <model-name>` to override the default model (e.g. `gemini-2.5-pro`, `gemini-2.5-flash`). Available models can be discovered via `agy models`.
- **Print Mode Flags**:
  - `-p` / `--print`: Executes a single prompt headlessly.
  - `--output-format <format>`: Supported formats include `text`, `json`, `stream-json`.
  - `--print-timeout <duration>`: Timeout string (e.g. `90s`, `5m`).
  - `--project <id>` / `--new-project`: Session binding argument ensuring workspace skills and MCP servers are attached.
- **Example Invocation**:
  ```bash
  agy --new-project -p "<prompt>" --model <model> --output-format text --print-timeout 5m
  ```
- **Configuration & Overrides**: User global defaults reside in `~/.gemini/antigravity-cli/settings.json`, and command line flags take precedence.

## Execution prerequisite — 2026-08-21

GUI-075 was assessed for execution against current `origin/main` (7f1e150). [[MCP-020]] remains **Preparing**, and the source tree has no shared dispatch-provider registry, typed `buildDispatchArgs`, or `modelOption` capability contract. GUI-075’s approved plan explicitly requires rebasing on MCP-020’s shared provider/supervisor SSOT and forbids creating a parallel GUI-only provider table.

No branch, worktree, ticket take, source edit, or provider-flag implementation was performed. Resume only after MCP-020 lands its shared contract, or after explicit authorization to expand this ticket’s scope.
