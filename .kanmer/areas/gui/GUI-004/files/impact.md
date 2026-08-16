# 1.3 — where the change lands

1.3 itself writes no product code: its deliverable is the verified findings in `research.md`
plus the plan-footer record. This maps where the findings land for **1.1 (GUI-002)** and
**1.2 (GUI-003)**, which it blocks.

## Files to change

| Path | Why | Risk |
|---|---|---|
| `apps/gui/src/main/providers.ts` | The whole delta. codex moves from `kind: "cli"` to `kind: "configFile"` at `configPath: ".codex/config.toml"`; opencode + antigravity `install.skillsDir` becomes `.agents/skills`. | **High.** The registry is one exported array driving connect, disconnect, skills install and dispatch. `codexServerName()` (`:88-95`) and its `cliAddCommand` disappear from the register path but the name it produces is still needed by the legacy `removeCommands`. |
| `apps/gui/src/main/providers.test.ts` | 15 existing tests. Needs TOML merge/unmerge cases: idempotent, unknown-table and unknown-key preserving, byte-stable re-merge, unmerge removes only `[mcp_servers.kanmer]`. | Medium — the existing `mcpServersMerge`/`mcpServersUnmerge` JSON tests are the template to copy. |
| `apps/gui/package.json` | Adds `smol-toml`. First TOML dependency in main. | **High — read AGENTS.md §8 gotcha 5 first.** electron-builder packs exactly one thing from `node_modules` (`electron-updater`); everything else must be bundled into `out/` by electron-vite. So `smol-toml` belongs in **devDependencies**, must NOT be added to `external` in the main Vite config, and must NOT be listed in `files:`. Getting this wrong ships a GUI that works in dev and throws "Cannot find module" when packaged. |
| `apps/gui/src/renderer/src/components/Settings.tsx` | `ConnectSection` (`:385-503`) gains the codex trust state. | Low. |
| `README.md` | "Connect an agent manually" — align with the new codex behaviour; a project-file example already exists. | Low. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `apps/gui/src/main/providers.ts:114-133` | `mcpServersMerge`/`mcpServersUnmerge` — the existing pure JSON merge pair. The TOML pair must match this shape and purity so the same tests apply. |
| `apps/gui/src/main/connect.ts:227-298` | How `register.kind` is dispatched, and where `removeCommands` runs on connect and disconnect. The legacy `codex mcp remove kanmer-<project>` cleanup hangs here and must stay best-effort — a failure must not fail the connect. |
| `apps/gui/src/main/connect.ts:34-46` | `serverInvocation(boardRoot)` — the exact `command`/`args`/`env` trio the TOML table must carry. Note it uses `process.execPath` with `ELECTRON_RUN_AS_NODE=1`, so `env` is not optional for codex. |
| `apps/gui/src/main/connect.ts:93-108,182-220` | `removeBundledSkillsOnly`, `skillsStatus`, `updateSkills` — the stamping and update-offer flow 1.2 reuses unchanged. |
| `~/.codex/config.toml` (this machine) | A real-world instance of everything the merge must survive: 46 `[projects.…]` entries, 5 `[mcp_servers.…]`, mixed quote styles, lowercased Windows paths, and a live `kanmer-pegasus` entry to drain. Worth copying as a test fixture. |
| `apps/gui/src/main/index.ts:616-626` | Confirms connect/skills already receive `sourceRoot`, so `.codex/config.toml` and `.agents/skills/` land in the source checkout, not the board worktree. No root ambiguity here. |

## Not touched

Core, the MCP server, the tool surface, and the skills' content. Phase 1 is registration and
install plumbing only — hence it is independent of Phase 2 and shippable first.

## Sequencing note

1.1 and 1.2 both edit the same `providers.ts` registry array. They are small enough to land as
one PR; if split, do 1.1 first — 1.2's change is two `skillsDir` string edits plus tests, and
rebasing that over 1.1 is trivial in the other order.
