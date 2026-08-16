## Raw evidence (2026-08-16, read-only probes)

### smol-toml round-trip of the live `~/.codex/config.toml`

```
orig bytes 9704   roundtrip bytes 10092   identical: false
```

Two concrete mutations, both from `TOML.parse` → `TOML.stringify` (smol-toml, the
dep already in providers.ts):

1. `startup_timeout_sec = 120.0` → `startup_timeout_sec = 120`
   (float collapses to integer; codex deserialises this field as f64)
2. every single-quoted literal string is rewritten as a double-quoted escaped
   string: `source = '\\?\C:\Users\PC\.codex\...'`
   → `source = "\\\\?\\C:\\Users\\PC\\.codex\\..."`
   Same 65 `[projects.'c:\...']` table headers likewise → `[projects."c:\\..."]`.

Comments would also be lost (this particular file has none; other users' will).

### Live state of the file

`~/.codex/config.toml` currently has exactly two `mcp_servers` entries:
`openaiDeveloperDocs` (url) and `node_repl` (command + env). **No
`mcp_servers.kanmer-*` remains** — the `kanmer-pegasus` entry named in the ticket
is already gone, and `pegasus/.codex/config.toml` now holds a proper
`[mcp_servers.kanmer]`. The pegasus case must therefore be a **synthetic
fixture**; it cannot be reproduced from this machine.

Formatting survived whatever removed the pegasus entry (`120.0` and the literal
strings are intact) — weak but real evidence that `codex mcp remove` edits the
file surgically rather than round-tripping it.

### `codex mcp` CLI surface (installed CLI, verified)

```
codex mcp list | get | add | remove | login | logout
codex mcp list --json     → [{ name, enabled, transport: { type, command, args, env, cwd }, startup_timeout_sec, ... }]
codex mcp remove <NAME>
```

So the *listing* half of the sweep has two possible sources: parse the TOML
(pure, testable, works without codex on PATH) or shell out to `codex mcp list
--json` (authoritative across config layers, needs the CLI).

### The registration shapes that collide in `.mcp.json`

Claude (`claude mcp add kanmer -s project`) writes, in this repo today:

```json
"kanmer": { "type": "stdio", "command": "...Kanmer.exe", "args": [...], "env": {...} }
```

grok's `mcpServersMerge` writes the same key with **no `type` field**:

```json
"kanmer": { "command": ..., "args": ..., "env": ... }
```

Same file, same key. Last writer wins; first disconnecter deletes the other.

### Legacy global entry shape (recoverable project root)

`pegasus/.codex/config.toml` shows what the writer produces:

```toml
args = [ "...kanmer-mcp.cjs", "--root", "C:\\...\\pegasus\\.worktrees\\kanmer",
         "--repo-root", "C:\\...\\pegasus" ]
```

The sweep can recover the real project root from `--repo-root` (falling back to
`--root`) instead of guessing from the lossy `kanmer-<basename>` name. Basenames
are not unique across a machine; `--repo-root` is.
