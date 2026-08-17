# Files — MCP-016

## What the change touches

| File | Change | Risk |
|---|---|---|
| `plugins/kanmer/.mcp.json` | **Deleted.** It is the only thing `agy` reads for MCP, and the only thing `.codex-plugin/plugin.json` points at. | Low in-repo (nothing but the rail reads it), but it is the file a future contributor is most likely to recreate "to fix codex". The rail must forbid it by name. |
| `plugins/kanmer/.codex-plugin/plugin.json` | Remove the `"mcpServers": "./.mcp.json"` key. Everything else (name, version, skills, interface) unchanged. | Low. `release.mjs` only rewrites `version` here. |
| `scripts/check-plugin-sync.mjs` | Replace the `.mcp.json` shape block with an **absence** assertion (no `plugins/kanmer/.mcp.json`, no `mcpServers` key in the codex manifest); relax the manifest→mcpServers loop so only the Claude manifest is required to declare one; drop `.mcp.json` from the no-`--root` loop. | Medium — this file is the rail. A mistake here passes silently. Each new assertion is demonstrated failing on a deliberately reverted manifest. |
| `docs/functional/frd/FRD-012-connect.md` | **R6** rewritten: matrix rows for codex and `agy` become "not advertised", the two consequence paragraphs replaced by the decision and its reasoning; **R2**'s codex bullet corrected; the "Open work" line for MCP-016 closed. | Medium — R6 is the governing statement other tickets cite. |
| `README.md` | The codex paragraph in §"Install as a plugin" reworded from "codex cannot start it" to "Kanmer does not ship one for codex"; one sentence added for Antigravity. | Low. |

## Ripple effects

- **Packaging**: none. `electron-builder.yml` packs `plugins/kanmer` as a single
  `extraResources` entry, so a removed file inside it needs no manifest change.
  `check-updater-package.mjs` / `verify-release-assets.mjs` reference neither
  `.mcp.json` nor `mcpServers`.
- **Connect / providers**: none. `connect.ts` and `providers.ts` never read the
  plugin's `.mcp.json`; `providers.test.ts:87` asserts no provider writes a file
  by that name. Connect's codex registration (`<repo>/.codex/config.toml`) and
  Antigravity registration (`<repo>/.agents/mcp_config.json`) are untouched and
  are what those users' boards come from — before and after.
- **Skills**: none. Both hosts keep all 12; the skills key in both manifests is
  untouched.
- **`release.mjs`**: none. It rewrites `version` in both `plugin.json` files and
  does not care about `mcpServers`.
- **Tests**: no unit test asserts the plugin's `.mcp.json` exists. `npm test`,
  `typecheck`, `check:manual` and `verify:agents-block` are unaffected in
  principle; run anyway.

## Deliberately out of scope

- `plugins/kanmer/mcp/claude.mcp.json` — it works for Claude Code and grok
  (`get_status` answered from `electron: 31.7.7`, MCP-011). Untouched, and its
  `plugin:check` rules are untouched.
- **Upstreaming** (option 4 in the ticket body). Not taken here; the FRD amendment
  says what a host would have to gain for the entry to come back.
- **`docs/manual/`** — never mentions plugin installs (Finding 6). Adding a
  chapter about a plugin capability Kanmer no longer ships would be worse than
  the silence.
- **`AGENTS.md:149`** — the repo map's `.mcp.json` line goes stale. Under this
  ticket's standing instruction not to commit an `AGENTS.md` change; filed as a
  follow-up instead of absorbed (Finding 7).
- `ADR-0012`'s historical prose mentioning `plugins/kanmer/.mcp.json` — it is a
  record of a past decision's context, correct as history.

## Context files an implementer must read first

| File | What it tells you |
|---|---|
| `scripts/check-plugin-sync.mjs:184-296` | Why the two MCP configs deliberately differ and must not be unified — and that this ticket removes one side of that pairing, so the comment block, not just the code, has to be re-reasoned. |
| `plugins/kanmer/mcp/claude.mcp.json` | The file that must NOT change, and the `_comment` warning against copying the sibling's `cwd` form into it (it collapses grok's handshake). |
| `docs/functional/frd/FRD-012-connect.md` R2/R6/R7 | The governing text. R6's matrix is the thing being amended; R2's codex bullet names MCP-016 as the open decision and must be closed. |
| `.agents/mcp_config.json` (working tree, not committed) | The shadowing hazard: Connect's `agy` entry is also named `kanmer`. Probe `agy` from a Connect-free folder or you will measure Connect. |
| `apps/gui/src/main/providers.ts` | Confirms codex's Connect path writes `<root>/.codex/config.toml` — the registration that makes the plugin's redundant. |
