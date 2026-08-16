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
