# Files — portable Codex MCP registration

## Change surface

| File or module | Expected change | Risk |
|---|---|---|
| `apps/gui/src/main/connect.ts` | Replace Codex's machine-specific `serverInvocation` with a provider-capable portable invocation; keep other providers explicit. | A shared invocation currently feeds multiple providers, so changing it globally could break Claude, Grok, OpenCode, or Antigravity. |
| `apps/gui/src/main/providers.ts` | Represent the portable Codex command shape without forcing every provider to share it. Keep TOML merge/unmerge ownership and preservation guarantees. | Provider isolation and idempotent merges are established invariants. |
| `apps/gui/src/main/providers.test.ts` | Replace assertions that require absolute command/`--root`; add no-absolute-path and preservation tests. | String-only tests can pass without a launch; integration proof is also required. |
| `apps/gui/src/main/connect.test.ts` | Cover packaged/dev invocation selection and clear missing-launcher diagnostics where the seam belongs. | Existing fixtures encode absolute registrations for other hosts and must not be mechanically rewritten. |
| `apps/gui/electron-builder.yml` | Package/install the dedicated launcher and make it discoverable; ensure uninstall and custom install-directory behavior. | PATH mutation, upgrades, quoting, and stale launchers are Windows-sensitive. |
| New launcher source/build script under `apps/gui` or `scripts/` | Locate the installed Electron binary and bundled MCP server relative to itself, set the runtime environment, preserve cwd, and forward stdio/exit status. | A script shim may not be executable by all hosts; native launcher choice needs a tested build/release path. |
| `scripts/check-updater-package.mjs` and related packaging tests | Assert the packaged launcher exists, resolves its sibling artifacts, and survives the packaged layout. | Checking file presence alone would not prove it launches. |
| `packages/mcp-server/src/root.ts` and core discovery tests | Likely no functional change; consume existing discovery and add regression proof only if a gap appears. | Do not reintroduce absolute roots to mask a cwd/launcher failure. |
| `docs/functional/frd/FRD-012-connect.md` | Amend R1/R1c/R7 and acceptance criteria from absolute/gitignored Codex registration to portable/shareable registration. | This intentionally reverses current accepted wording; the history must remain explicit. |
| `docs/architecture/adr/ADR-0012-board-discovery-order.md` | Clarify that Codex Connect consumes discovery and no longer pins roots, or add a new ADR if launcher distribution is judged a separate architectural decision. | Do not silently mutate the rationale for an accepted decision. |
| `.gitignore` and its rail in `providers.test.ts` | Revisit ignoring `.codex/config.toml` only after portability is proven; portable project config may be committed. | Removing the ignore prematurely exposes current machine-specific files. |

## Consumer evidence

| File | Why it matters |
|---|---|
| `C:\Users\PC\Documents\GitHub\pegasus\.codex\config.toml` | Concrete tracked failure case with install, source, and board paths from one machine. |
| Pegasus Git index | Confirms the config is tracked; GUI-083's later ignore rule cannot repair an already tracked file. |

## Context files an implementer must read

| File | Constraint conveyed |
|---|---|
| `docs/functional/frd/FRD-012-connect.md` | Provider ownership, project trust, current absolute-path decision, gitignore decision, and real-host evidence standard. |
| `docs/architecture/adr/ADR-0012-board-discovery-order.md` | Discovery order, board-worktree preference, repo-root derivation, and fatal not-found behavior. |
| `apps/gui/src/main/providers.ts` | One-host/one-file ownership and TOML merge/unmerge invariants. |
| `apps/gui/src/main/connect.ts` | Packaged versus development bundle resolution and current shared Invocation coupling. |
| `apps/gui/electron-builder.yml` | Packaged artifact layout and custom NSIS install behavior. |
| `packages/mcp-server/src/root.ts` | Why root flags can be removed and how cwd becomes board/repo identity. |
| `apps/gui/src/main/providers.test.ts` | Current rails for idempotence, unrelated-key preservation, and the intentionally hardcoded shape to replace. |
| `scripts/check-updater-package.mjs` | Existing packaged-product verification style; launcher presence alone is insufficient. |

## Ripple effects

- Connect/reconnect and disconnect behavior for Codex.
- Repo-staleness detection of provider registrations if it compares invocation content.
- Legacy global-entry classification, which reads `--repo-root`/`--root` to identify a project; portable entries need a new classification rule or must be excluded safely.
- Installer upgrades/uninstalls and any process-session PATH refresh behavior.
- Documentation that currently tells users registration files are machine-local and gitignored.
- Release checks and smoke tests must invoke `get_status`, not only parse TOML or list an MCP entry.

## Out of scope

- Editing or untracking Pegasus's committed config.
- Restoring a Codex plugin-supplied MCP server.
- Changing Claude, Grok, OpenCode, or Antigravity registrations unless a shared type must be split to preserve their existing behavior.
- Replacing Kanmer's board discovery algorithm.
- Implementing remote/HTTP MCP transport.
