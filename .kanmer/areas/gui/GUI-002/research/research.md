# codex project config — research

Everything here was verified against the **installed CLI**, not documentation
(GUI-004 holds the full record). Two facts decided the shape:

`codex mcp add --help` shows `--url`, `--env`, `--bearer-token-env-var` and
`-c`. There is no scope flag. It always writes `~/.codex/config.toml`. So the
pileup ADR-0007 describes is not a habit anyone can avoid by using the CLI more
carefully — it is what the CLI does. Hand-merging the project file is the only
route to one entry per project, which makes ADR-0007 *necessary* rather than
merely tidier. The evidence is on this machine: `[mcp_servers.kanmer-pegasus]`
sits in the global config right now.

`codex mcp remove` **does** exist, though the published docs list only
add/list/login. `codex mcp --help` shows list, get, add, remove, login, logout.
Believing the docs would have meant concluding the legacy cleanup was
impossible and shipping without it.

Trust is the third fact, and it changes the UI. Project config loads for
trusted folders only, and trust is recorded in the *global* config as
`[projects.'<path>'] trust_level = "trusted"` — 46 such entries here. That makes
the caveat checkable rather than a warning to be displayed unconditionally.
