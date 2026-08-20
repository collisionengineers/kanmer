# Files — MCP-015

## Files to add

| Path | Exact responsibility |
|---|---|
| `plugins/kanmer/mcp_config.json` | Antigravity’s documented plugin MCP descriptor. Use only real-verified `${PLUGIN_ROOT}`/runtime syntax, no cwd/root flags, no machine path, and no deleted `.mcp.json` compatibility file. |
| `apps/gui/src/main/antigravity-plugin.ts` | Optional focused adapter for real CLI command construction, plugin list/validate/inspect parsing and bound functional probe. Reuse MCP-014’s plugin-managed abstraction where possible; add this only for host-specific parsing/binding. |
| `apps/gui/src/main/antigravity-plugin.test.ts` | Real-output fixtures for plugin installed/absent/invalid and bound/unbound capability results. |

## Files to modify

| Path | Required change |
|---|---|
| `apps/gui/src/main/providers.ts` | Move Antigravity to the existing plugin-managed install lifecycle; remove new project config/copy ownership; set dispatch true and exact `agy --add-dir <sourceRoot> -p <prompt>` args after re-verification. Preserve provider id/label and other providers. |
| `apps/gui/src/main/connect.ts` | Preflight runtime/plugin, install and validate user plugin, make a real bound `get_status` call before legacy cleanup, then surgically remove owned `.agents/mcp_config.json`/stamped `.agents/skills`; symmetric user-scoped uninstall/verification. Reuse MCP-014 ordering/helpers. |
| `apps/gui/src/main/dispatch.ts` or shared core `dispatch-providers.ts` from MCP-020 | Add Antigravity to the shared dispatch registry with bound args only. If MCP-020 has landed, change the SSOT there and let GUI consume it; do not duplicate args in GUI. |
| `apps/gui/src/main/providers.test.ts` | Pin plugin-managed provider, exact bound dispatch args, no legacy outputs, unchanged other providers, dispatch list/UI state and ignore ownership. |
| `apps/gui/src/main/connect.test.ts` | Test plugin/runtime preflight, install/validate/bound-tool-call-before-cleanup, rollback, legacy preservation, global-scope disconnect and idempotence. |
| `apps/gui/src/main/dispatch.test.ts` plus core dispatch-provider/supervisor tests | Prove source root is passed via `--add-dir`, no bare `agy` path exists, task prompt/stdio/exit work and actual capability probe seam distinguishes PONG from Kanmer tool access. |
| `apps/gui/src/renderer/src/components/Settings.tsx` | Update Connect overview and remove Antigravity’s no-dispatch badge through provider state; disclose user-scoped plugin and CLI binding requirement. Do not hardcode provider ids if the renderer already consumes provider fields. |
| `apps/gui/src/shared/ipc.ts` | Only if provider rows need an explicit scope/binding note rather than renderer inference. Prefer structured `installScope`/`dispatchNote` over new hardcoded copy. |
| `.gitignore` | Remove `.agents/mcp_config.json` and `.agents/skills/` only when Antigravity is their last writer/consumer after considering OpenCode/Codex/shared-tree decisions. **Do not remove `.agents/skills/` if another current provider still writes it.** Update tests/comments exactly. |
| `plugins/kanmer/.claude-plugin/plugin.json` | Normally unchanged; Antigravity uses its own documented root `mcp_config.json`. Do not re-add an agy server through this manifest unless real validation proves that is the host’s required route. |
| `scripts/check-plugin-sync.mjs` | Require Antigravity descriptor and validate no `.mcp.json`, no cwd/root/machine path, correct bundle/skills and provider/plugin parity; pin all 12 skills as valid for Antigravity. |
| `scripts/verify-skill-prose.mjs` or skill-frontmatter test | Add/retain a parser-validity check across all plugin skills if the current rail does not catch Antigravity-compatible YAML. Do not add a second skill roster. |
| `docs/functional/frd/FRD-012-connect.md` | Update Antigravity row: native user plugin, documented `mcp_config.json`, Node/runtime prerequisite, bound CLI behavior, no bare-session support, real tool oracle and user-scoped disconnect. |
| `docs/functional/frd/FRD-010-task-scoped-dispatch.md` | Add Antigravity as dispatchable only through `--add-dir <sourceRoot>` and require a real Kanmer tool call/deliverable in acceptance. |
| `docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md` | Update the open caveat that MCP-015 owns: plugin lifecycle plus bound dispatch now establish the mechanism. Preserve the evidence-method lesson. |
| `docs/manual/connect.md` and generated manual | Replace project-file/copy wording with plugin install; retain exact interactive CLI binding guidance; remove “no background dispatch”; disclose all-workspaces uninstall. Regenerate. |
| `apps/gui/release-notes.md` | Migration: install plugin through Connect, verify bound tool call, owned legacy project files cleaned only after success, restart/run CLI with `--add-dir`; dispatch now available. |

## Context files

| Path | Why |
|---|---|
| GUI-073 research/outcome via Kanmer | Definitive evidence for `--add-dir`/project binding, real workspace files and false tool-list oracle. |
| `MASTERPLAN.md` 0.4.1 existing-ticket rescope | Plugin install plus dispatch after GUI-073 adjudication. |
| MCP-014 plan/implementation | Shared explicit plugin-managed lifecycle; reuse it rather than create a second provider framework. |
| MCP-020 shared dispatch provider/supervisor (when landed) | Dispatch provider SSOT and process lifecycle. Antigravity joins it only with bound args. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Actual plugin server target; descriptor must locate it through verified plugin-root token. |
| `plugins/kanmer/skills/*` | All 12 must parse/load; current `kanmer-report` frontmatter should be rechecked against agy parser. |
| `docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md` | Binding and mechanism-verification constraints. |

## Exact command/evidence contract

Re-verify and pin before implementation:

```text
agy --version
agy plugin --help
agy plugin validate <pluginRoot>
agy plugin install <pluginRoot>
agy plugin list / inspect (exact supported forms)
agy --add-dir <sourceRoot> -p <controlled prompt that invokes get_status>
agy -p <same prompt>                         # negative unbound control
agy plugin uninstall <verified identifier>
```

## Ripple effects

- Plugin install becomes user-scoped; Connect/Disconnect affects every Antigravity workspace for that user.
- Bare interactive `agy` still does not bind; manual/UI must instruct `--add-dir` or a user-managed project id.
- Antigravity becomes dispatchable in GUI and MCP-020’s shared allowlist/registry only after bound functional proof.
- Legacy `.agents` state becomes migration residue, but `.agents/skills` may remain owned by another provider—cleanup/ignore decisions must inspect actual registry.
- Adding Antigravity `mcp_config.json` changes plugin package bytes/checks, but not MCP tool surface.

## Do not modify

- Re-add `plugins/kanmer/.mcp.json`, serialize cwd/root into plugin descriptor, launch bare `agy`, persist Antigravity project ids, set global environment/PATH or claim IDE behavior.
- Remove shared `.agents` files another provider owns.
- Change task prompts, other provider dispatch, remote MCP policy, storage or unrelated plugin manifests.
- Treat process start/PONG/tool listing as Kanmer capability proof.
