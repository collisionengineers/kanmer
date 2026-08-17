# MCP-013 — Files this change touches

## Changed

| File | Change | Risk |
|---|---|---|
| `apps/gui/src/main/connect.ts` | Add `marketplaceRoot()` (derived from `pluginRoot()`, two segments up) and pass it to `marketplaceCommands`. Stop swallowing a non-zero exit: `installSkills`'s marketplace branch reports the failing command and its output, and `connectAgent` returns `ok: false` with that command as the copy-paste fallback. | **Medium.** The failure path is a behaviour change users will see. Finding 4 measured every idempotent re-run at exit 0, so it cannot fire spuriously — but a host missing from PATH will now surface as a failed Connect where it previously showed a tick. That is the point of the ticket. |
| `apps/gui/src/main/providers.ts` | Rename the `InstallSpec` parameter from `localDir` to `marketplaceRoot` (it is now a different directory, and a name that still said "the plugin dir" is how this bug survives a second time). Add codex's missing second command `codex plugin add kanmer@kanmer-plugins`. | **Low.** Pure data; both commands measured. |
| `apps/gui/electron-builder.yml` | `extraResources`: add `.claude-plugin/marketplace.json` and `.agents/plugins/marketplace.json`, packed to the same relative paths under `resources/`. Correct the comment, which currently claims something untrue. | **Low**, and validated ahead of the edit — Finding 3 installed both hosts from a mirror of exactly this layout and called a tool through it. |
| `apps/gui/src/main/connect.test.ts` | New tests: a marketplace command that genuinely exits non-zero surfaces as `ok: false` carrying the command; a succeeding one stays `ok: true`. Driven through the real `exec`, not a stub, so the swallow cannot come back via a mocked seam. | Low. |
| `apps/gui/src/main/providers.test.ts` | New test tying each provider's hard-coded `<plugin>@<marketplace>` reference to the name declared in the marketplace manifest on disk. This is the rail for Finding 5 — the names may differ, but neither may drift from its manifest. | Low. |
| `scripts/check-plugin-sync.mjs` | Assert both marketplace manifests exist, that each one's `plugins[].source` resolves to `plugins/kanmer`, and that `electron-builder.yml`'s `extraResources` packs both manifests plus the plugin directory. | Low; `yaml` is already imported there. |
| `scripts/check-updater-package.mjs` | Assert the **packed** output contains both marketplace JSONs beside `resources/plugins/kanmer` — the packaging claim checked against the artifact rather than the config. | Low; mirrors the existing `resources/mcp/kanmer-mcp.cjs` assertion. |
| `docs/functional/frd/FRD-012-connect.md` | R2's Claude and codex bullets: replace "Owner: MCP-013" with what shipped, incl. codex's two-command install and the packaged-app marketplace source. Update the closing open-work list. | Low, but required — R2 currently documents the defect as open. |

## Ripple

- **`InstallSpec` signature.** Only `connect.ts:298` calls `marketplaceCommands`; the type change is a rename, not a shape change, so `typecheck` is the whole blast radius.
- **`ConnectResult.ok` semantics for marketplace hosts.** `Settings.tsx:443-457` already renders `ok: false` as "Couldn't connect … Run this yourself:" with the copy button — no renderer change needed, which is why this shape was chosen over inventing a new field.
- **`updateSkills`** re-enters `installSkills`, so marketplace hosts get the same loud failure there for free.
- **`dist:check`** gains two assertions; it needs a full `npm run dist`, so it is not part of the standard rail and is run only if the packaging change is being validated end-to-end.
- **No plugin-bundle rebuild.** Nothing under `plugins/kanmer/` changes, so `plugin:build` is not required and the committed bundle's bytes are untouched.

## Deliberately NOT touched

- `plugins/kanmer/.mcp.json`, `plugins/kanmer/mcp/claude.mcp.json`, and both `plugin.json` files — MCP-011 settled these six days ago by measurement, and the ticket's defect 5 is already closed there (research Finding 5).
- Anything that decides whether codex/`agy` should advertise a plugin-supplied **MCP server** — that is [[MCP-016]], still open. Adding `codex plugin add` installs skills, which MCP-016 already treats as the working half.
- The marketplace **names**. Finding 5: they legitimately differ, FRD-012 R2 already says so, and renaming would relocate codex's cache for existing users. A rail is added instead of a rename.
- grok / opencode / antigravity install paths (MCP-014, MCP-015).

## Context an implementer must read first

| File | What it tells you |
|---|---|
| `.kanmer/…/MCP-011/research` (or the ticket body) | Why the two bundled MCP configs must stay different, and that codex expands no `${…}`. Prevents "helpfully" unifying them. |
| `scripts/check-plugin-sync.mjs:184-296` | The existing manifest rail and its reasoning. New assertions belong beside these, in the same style. |
| `scripts/check-plugin-sync.mjs:29-88` | Why the script **refuses to run in a linked worktree** (MCP-007). `plugin:check` must be run from the main checkout. |
| `apps/gui/src/renderer/src/components/Settings.tsx:443-457` | Exactly how `ok`, `command` and `output` are rendered — the reason the fix returns `ok: false` with the failing command rather than adding a field. |
| `apps/gui/src/main/connect.test.ts:1-10` | The `vi.mock("electron")` seam every test in this file depends on; `app.isPackaged`/`getAppPath` are stubbed, so anything reaching `pluginRoot()` in a test resolves against `/unused`. |
| `docs/functional/frd/FRD-012-connect.md` R2, R6 | The install matrix this ticket is named in twice. R6 is MCP-011's and must not be edited here. |
| `docs/plans/kanmer-v2/phase-6-agents-connect/plan.md:30` | The written decision the packaging regressed against — cite it in the report. |
