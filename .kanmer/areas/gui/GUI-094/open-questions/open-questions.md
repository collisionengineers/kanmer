# Open questions

No user decision is currently required.

## Resolved during research

- [x] Should the project point relatively to the installed `kanmer-mcp.cjs`? No. The installed artifact is outside the repo and Codex does not document a config-file-relative MCP path base.
- [x] Should portable Codex registration keep `--root` and `--repo-root`? No. Preserve the workspace cwd and consume ADR-0012 discovery; prove the resulting roots with a real tool call.
- [x] What launcher contract should the plan target? A dedicated OS-resolvable `kanmer-mcp` executable that owns install discovery and Electron-as-Node setup.

## Parked (explicitly deferred)

None.
