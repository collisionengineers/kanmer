# MCP-013 — Post-implementation report

Branch `mcp-013-marketplace-root`, worktree `.worktrees/mcp-013`, off
`origin/main` = `8d9d8f9`. One commit: `df21cb2`.

## What changed, and why each

| File | Change | Why this shape |
|---|---|---|
| `apps/gui/src/main/connect.ts` | `marketplaceRoot()` = `resolve(pluginRoot(), "..", "..")`, exported alongside `pluginRoot()`; `installSkills` returns a `SkillsInstallOutcome` instead of a note string; `connectAgent` and `updateSkills` return `ok: false` with the failing command; new `commandFailureText()` | **Derived, not resolved twice.** A parallel `if (app.isPackaged)` block is how these two paths came apart. The invariant `marketplaceRoot()/plugins/kanmer === pluginRoot()` is now structural and is asserted. Both are exported because a mismatch between two directories is not observable from either one alone. |
| `apps/gui/src/main/providers.ts` | `InstallSpec` parameter `localDir` → `marketplaceRoot`; codex gains `codex plugin add kanmer@kanmer-plugins` | The rename is part of the fix — `localDir` was equally true of the wrong directory, which is how the bug read as correct. |
| `apps/gui/electron-builder.yml` | `extraResources` packs both marketplace manifests; the comment that claimed a local marketplace source now describes one | Validated **before** the edit against a mirror of the resulting layout (see below). |
| `apps/gui/src/main/connect.test.ts` | 7 new tests: the invariant, the `ok:false` mapping, ordering, the success path, `updateSkills` | Driven through the **real** `exec` with real non-zero-exiting subprocesses. |
| `apps/gui/src/main/providers.test.ts` | 7 new tests pinning each `<plugin>@<marketplace>` string to its manifest, and each manifest's `source` to a directory that exists | The names legitimately differ, so the rail is agreement-with-the-manifest, not agreement-with-each-other. |
| `scripts/check-plugin-sync.mjs` | `checkMarketplaces()` — both manifests parse, name, declare `kanmer`, resolve to `plugins/kanmer`; the two names have not collapsed into one; `extraResources` packs all three entries | Config-level, free, runs on every `plugin:check`. |
| `scripts/check-updater-package.mjs` | check 7: the packed `resources/` carries the plugin manifest and both marketplace manifests | Artifact-level. A correct `from:` that silently packs nothing is exactly what a config check cannot see. |
| `docs/functional/frd/FRD-012-connect.md` | R2's two marketplace bullets rewritten; a third bullet added for the packaged case; MCP-013 removed from the open-work list | R2 documented this defect as open and named this ticket as owner, twice. |

## Three things that differ from the plan, each recorded rather than absorbed

1. **The `copySkills` branch was swallowing too.** `connectAgent`'s
   `.catch(() => "skills failed: …")` turned any throw from `installSkills` into
   a note on an `ok: true` result — the same defect as the marketplace branch,
   one branch over, and not in the ticket. Both now report through the same
   `failure` channel. Extending the fix was cheaper and more honest than fixing
   one of two identical swallows.
2. **codex was missing its install command entirely**, which the ticket did not
   suspect. `codex plugin marketplace add` alone leaves the plugin
   `not installed` — `codex plugin list` says so in as many words — so Connect's
   codex path delivered **no skills at all**, even with the root corrected. This
   is the same defect (an install command that does not install), and it is
   skills-only, so it does not touch what [[MCP-016]] owns.
3. **`marketplaceRoot()` and `pluginRoot()` are exported.** The plan did not
   anticipate needing a seam. The alternative was asserting literal paths, which
   under this test file's `vi.mock("electron")` would have tested the stub rather
   than the derivation.

## Evidence — the mechanism, never the message

Every measurement ran in an **isolated profile** (`CLAUDE_CONFIG_DIR` into
scratch, `CODEX_HOME` a throwaway dir), each with a control proving the profile
was empty first.

**Claude, on this branch:**

```
$ claude plugin marketplace list
No marketplaces configured                                   ← control

$ claude plugin marketplace add "…\.worktrees\mcp-013\plugins\kanmer"      ← the OLD argument
✘ Failed to add marketplace: Marketplace file not found at
  …\.worktrees\mcp-013\plugins\kanmer\.claude-plugin\marketplace.json  EXIT=1

$ claude plugin marketplace add "…\.worktrees\mcp-013"                     ← what connect.ts now computes
✔ Successfully added marketplace: kanmer                              EXIT=0
$ claude plugin install kanmer@kanmer
✔ Successfully installed plugin: kanmer@kanmer (scope: user)          EXIT=0
```

The negative control is kept deliberately: it shows the fix is what changed, not
the environment.

**Then the tool was called** — an install success line is the proxy that hid this
class of bug, so it is not the evidence:

```
$ claude -p "Call mcp__plugin_kanmer_kanmer__get_status … print server.build,
             server.path, rootSource, exists, counts.byType.ticket"
plugin
C:\Users\PC\Documents\GitHub\kanmer\.worktrees\mcp-013\plugins\kanmer\mcp\kanmer-mcp.cjs
ancestor-worktree
true
160                                                                    EXIT=0
```

**codex, on this branch:**

```
$ codex plugin marketplace add "…\mcp-013\plugins\kanmer"
Error: invalid marketplace file …: marketplace root does not contain a
       supported manifest                                              EXIT=1
$ codex plugin marketplace add "…\mcp-013"
Added marketplace `kanmer-plugins`                                     EXIT=0
$ codex plugin add kanmer@kanmer-plugins
Installed plugin root: …\cache\kanmer-plugins\kanmer\0.3.2             EXIT=0
$ codex plugin list
kanmer@kanmer-plugins  installed, enabled  0.3.2
```

and the skills established by asking codex itself, not by listing files:

```
$ codex exec --skip-git-repo-check --dangerously-bypass-approvals-and-sandbox \
    "List the exact names of every skill available to you beginning with 'kanmer-'…"
kanmer-auto, kanmer-closeout, kanmer-docs, kanmer-execute, kanmer-groom,
kanmer-plan, kanmer-report, kanmer-research, kanmer-review, kanmer-setup,
kanmer-tickets, kanmer-verify                                          EXIT=0
```

**The packaged app** (research phase, before the packaging was edited): a mirror
of the resulting `resources/` layout — both manifests, `plugins/kanmer`,
`mcp/kanmer-mcp.cjs`, a dummy `app.asar` — was installed from by both hosts, and
`get_status` answered with `server.path` **inside the mirror**. So the packaging
change was validated as a fix before it was made, rather than asserted after.

## Every new assertion demonstrated failing on the defect it exists for

| Assertion | Defect reintroduced | Result |
|---|---|---|
| connect hands over the marketplace root | `marketplaceCommands(pluginRoot())` | 1 failed / 20 passed |
| `ok:false` + command + no later commands + `updateSkills` | the `plugin cmd skipped` swallow restored | 3 failed / 18 passed, each `expected true to be false` |
| `extraResources` packs both manifests | one `- from:` entry deleted | `plugin:check` exit 1, naming the entry |
| manifest `source` resolves | `./plugins/kanmer-old` | exit 1 |
| a manifest is present | file removed | exit 1 |
| the two names have not collapsed | both renamed `kanmer` | exit 1 |
| packed artifact carries both manifests | manifests absent from a synthetic `win-unpacked` | 4 failures → 2 when added |

## Governing docs

- **FRD-012** — R2's Claude and codex bullets closed and rewritten with the
  commands and outputs that established them; a third bullet records the
  packaged case; MCP-013 removed from the open-work list. **AC-4** (a failed
  command yields the exact copy-paste fallback) is newly satisfied for the two
  marketplace hosts. **R5** (ADR-0009's method clause) is how every claim above
  was produced. **R6/R7 unedited** — MCP-011's, and the ticket's defect 5 was
  already closed there.
- **ADR-0009** — followed, not amended.
- **No new ADR.** The path fix restores a stated invariant; the packaging
  implements a written v2 decision; the error surfacing implements an existing
  acceptance criterion.

## Risks and follow-ups

- **A host missing from PATH now shows a failed Connect** where it showed a tick.
  Intended. The output still says the board was registered, and the command is
  offered for copy-paste. Every idempotent re-run was measured at exit 0 —
  including re-pointing a same-named marketplace at a different path, which is
  the packaged-app-after-repo-checkout case — so this cannot fire spuriously.
- **[[MCP-016]] untouched and still open.** Installing codex's skills does not
  decide whether the plugin should advertise an MCP server codex cannot launch.
- `kanmerGit.test.ts` did not flake in this run (GUI-085/GUI-089).

## What kanmer-verify should run on merged main

1. `npm test`, `npm run typecheck`, `npm run verify:agents-block`,
   `npm run verify:skills`.
2. **`npm run plugin:check` from the MAIN checkout** — it refuses inside a linked
   worktree by design (MCP-007), so it is the one rail not settled pre-merge.
   Here it was exercised against a mirrored non-worktree copy of the tree
   (`plugin-sync OK — … marketplaces: kanmer, kanmer-plugins — both packed`),
   with the pre-existing bundle-byte comparison satisfied artificially because
   that half needs the main checkout's `node_modules`; nothing in this change
   touches the bundle.
3. A fresh clean-profile install of merged main on both hosts, **verified by
   calling a tool**, keeping the negative control.
