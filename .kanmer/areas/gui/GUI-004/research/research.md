# 1.3 Provider re-verification — findings

Verified 2026-08-16 against **the installed CLIs on this machine** and current official docs.
All five hosts' CLIs are installed locally, so most of this is observed behaviour rather than
documentation, which is the stronger evidence — ADR-0009's rule exists precisely because docs
went stale under this roadmap once already.

## Verdict

**FRD-012's registration and install matrices are correct.** No provider fact in the FRD needs
changing. What follows is the detail 1.1 and 1.2 need, plus four things the FRD does not say.

## Per host

### codex — the only one that changes (1.1)

- Project-scoped `.codex/config.toml` is real and is resolved **project root down to cwd,
  closest wins, trusted projects only**. Precedence: CLI flags > project config > `--profile`
  files > `~/.codex/config.toml` > `/etc/codex/config.toml` > built-in defaults.
- MCP declaration is `[mcp_servers.<name>]`. stdio keys: `command` (required), `args`, `env`,
  `env_vars`, `cwd`. Common: `startup_timeout_sec` (default 10), `tool_timeout_sec` (default
  60), `enabled`, `required`, `enabled_tools`, `disabled_tools`,
  `default_tools_approval_mode`. Kanmer needs `command` + `args` + `env` only.
- **`codex mcp add` cannot write a project file.** `codex mcp add --help` shows only `--url`,
  `--env`, `--bearer-token-env-var` and `-c`; there is no scope flag. It always writes
  `~/.codex/config.toml`. So hand-merging the project TOML is not a preference, it is the only
  route — ADR-0007's approach is confirmed necessary, not merely tidier.
- **`codex mcp remove` exists.** The published docs list only add/list/login, but
  `codex mcp --help` on the installed CLI shows `list, get, add, remove, login, logout, help`.
  1.1's legacy-cleanup step is safe.
- The pileup is live on this machine: `[mcp_servers.kanmer-pegasus]` is in the global config
  right now, one of 5 `mcp_servers` entries. Direct evidence for PRD-001 problem 5.

### opencode — 1.2

Skill search order (official docs), highest first:

1. `.opencode/skills/<name>/SKILL.md` (project)
2. `~/.config/opencode/skills/<name>/SKILL.md` (global)
3. `.claude/skills/<name>/SKILL.md` (project, Claude-compatible)
4. `~/.claude/skills/<name>/SKILL.md`
5. **`.agents/skills/<name>/SKILL.md` (project, agent-compatible)** ← what 1.2 writes
6. `~/.agents/skills/<name>/SKILL.md`

Frontmatter: `name` and `description` required; `license`, `compatibility`, `metadata`
optional. **The skill name must match its containing directory name** — Kanmer's roster already
satisfies this. Skills are permission-gated in `opencode.json` with `allow` / `deny` / `ask`,
wildcards supported.

### Antigravity — 1.2

- Project: `<workspace-root>/.agents/skills/<skill>/SKILL.md`. **Primary** location; `.agent/`
  (singular) is kept only for backward compatibility. Global: `~/.gemini/config/skills/`.
- Frontmatter: `description` **required**; `name` optional, defaulting to the folder name.
- Optional `scripts/`, `examples/`, `resources/` subdirectories are supported.

So one write to `.agents/skills/` genuinely serves both opencode and Antigravity, as FRD-012 R2
assumes. Kanmer's skills carry both `name` and `description`, satisfying both hosts' schemas.

### Claude Code — unchanged

`claude mcp add --help` confirms `-s, --scope <scope>` taking `local | user | project`,
**default `local`**. The shipped `-s project` is correct and writes the project `.mcp.json`.

### Grok — unchanged, but see gotcha 4

Skill discovery, highest first: `./.grok/skills/` (local) · `<repo_root>/.grok/skills/` (repo) ·
`~/.grok/skills/` (user) · `~/.claude/skills/` (user). Extra paths configurable via `[skills]`
in its config.toml. Registration stays project `.mcp.json`.

**Grok does not read `.agents/skills`.** FRD-012 R2 is right to keep it on `.grok/skills`; the
"one tree serves everyone" convergence covers opencode and Antigravity only.

## Four things the FRD does not say

1. **Trust is recorded globally, not in the project.** `~/.codex/config.toml` carries
   `[projects.'<path>'] trust_level = "trusted"`. This machine has 46 such entries, including
   `[projects.'c:\users\pc\documents\github\kanmer']`. That makes the trust caveat *checkable*:
   Connect can read the global config and tell the user whether this specific folder is trusted,
   instead of showing an unconditional warning. Recommended for 1.1 — it turns a caveat nobody
   reads into a state the UI can be honest about.
2. **Windows path keys are lowercased and quoting is inconsistent** — 45 entries use single
   quotes, 1 uses double. Any code that reads or writes `[projects.…]`, and the `[mcp_servers.…]`
   merge itself, must compare paths case-insensitively on Windows and must not assume a quote
   style. This is a concrete hazard for 1.1's "preserve unknown keys" requirement.
3. **Trust may inherit from a parent path.** `[projects.'c:\users\pc']` is trusted, which would
   cover every project under the user profile. Whether codex matches by exact path or nearest
   ancestor is unverified. If 1.1 implements the trust check in (1), it must resolve this —
   an exact-match-only check would wrongly report trusted folders as untrusted.
4. **Grok filters repo-scoped skills through `.gitignore`.** Its README: *"Repo-scoped skills
   (Local and Repo) respect `.gitignore` and are filtered out if ignored."* A repo that
   gitignores `.grok/` — common — silently loses the whole Kanmer roster with no error. Kanmer's
   own setup writes `.kanmer/` and `.worktrees/` into `.gitignore` but not `.grok/`, so it does
   not cause this itself, but Connect should warn when `.grok/skills` lands ignored.

## Sources

Installed CLIs (`codex mcp --help`, `codex mcp add --help`, `claude mcp add --help`,
`~/.grok/README.md` §Skills), plus:

- [Codex config basics](https://learn.chatgpt.com/docs/config-file/config-basic)
- [Codex MCP configuration](https://learn.chatgpt.com/docs/extend/mcp)
- [opencode Agent Skills](https://opencode.ai/docs/skills/)
- [Antigravity Skills](https://antigravity.google/docs/skills)
