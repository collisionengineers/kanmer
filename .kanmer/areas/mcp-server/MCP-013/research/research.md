# MCP-013 — Research: where the marketplace actually is, and what the packaged app must carry

## The question

Five defects were handed to this ticket. Research must settle, **against the
installed binaries** (ADR-0009's amended method clause — establish, never infer;
the command and its output are the admissible evidence; a positive control is
necessary but not sufficient, so verify the mechanism rather than a proxy):

1. Is `pluginRoot()` the wrong argument for the marketplace command, and does the
   repo root work in its place?
2. What exactly does `connect.ts` do with the non-zero exit, and what should it
   do instead without breaking idempotent re-Connect?
3. Can the **packaged** app carry a local marketplace source at all — is this a
   packaging fix or a product decision?
4. Must the two marketplace names differ?
5. Do the two bundled MCP configs still disagree about `${…}_ROOT`?

## Method and environment

Windows 11, 2026-08-17. `claude` 2.1.233, `codex` 0.147.0, `node` v24.14.0.
Repo at `0.3.2`, HEAD `3e9ee2c`, i.e. **after** MCP-011 (PR #52, `29bee81`).

**Every probe ran in an isolated profile**, so no machine state was mutated:
`CLAUDE_CONFIG_DIR` pointed at a scratch directory, `CODEX_HOME` at a throwaway
directory. Isolation is itself established, not assumed — the control below.

```
$ $env:CLAUDE_CONFIG_DIR = "<scratch>\cleanprofile"
$ claude plugin marketplace list
No marketplaces configured                                              EXIT=0
```

versus the real profile, which lists `claude-plugins-official`. The clean profile
is genuinely clean, so an install into it is evidence about the command and not
about leftovers.

---

## Finding 1 — the defect reproduces exactly, and the repo root fixes it

`pluginRoot()` (`connect.ts:64-67`) returns `<repo>/plugins/kanmer`, and
`installSkills` (`connect.ts:297`) hands it to `marketplaceCommands`. Both
marketplace manifests are one and two levels **above** that directory.

```
$ claude plugin marketplace add "C:\Users\PC\Documents\GitHub\kanmer\plugins\kanmer"
✘ Failed to add marketplace: Marketplace file not found at
  C:\Users\PC\Documents\GitHub\kanmer\plugins\kanmer\.claude-plugin\marketplace.json
                                                                        EXIT=1
$ claude plugin marketplace add "C:\Users\PC\Documents\GitHub\kanmer"
✔ Successfully added marketplace: kanmer (declared in user settings)    EXIT=0
$ claude plugin install kanmer@kanmer
✔ Successfully installed plugin: kanmer@kanmer (scope: user)            EXIT=0
```

**Mechanism, not the install message.** An install success line is a proxy; the
mechanism is a tool answering. Called for real, in this repo, through the
plugin-installed server:

```
$ claude -p "Call the MCP tool mcp__plugin_kanmer_kanmer__get_status with no
             arguments. Print its raw JSON result verbatim and nothing else."
             --dangerously-skip-permissions
{
  "projectRoot": "C:\\Users\\PC\\Documents\\GitHub\\kanmer\\.worktrees\\kanmer",
  "rootSource": "cwd-worktree",
  "server": { "version": "0.3.2", "build": "plugin",
              "path": "…\\kanmer\\plugins\\kanmer\\mcp\\kanmer-mcp.cjs" },
  "exists": true,
  "counts": { "byType": { "ticket": 157 } }
}                                                                       EXIT=0
```

`build: "plugin"` and 157 real tickets. The Claude marketplace path works
end-to-end the moment the command is given the right directory.

The same defect, same shape, on codex:

```
$ codex plugin marketplace add "…\kanmer\plugins\kanmer"
Error: invalid marketplace file `\\?\…\kanmer\plugins\kanmer`:
       marketplace root does not contain a supported manifest            EXIT=1
$ codex plugin marketplace add "…\kanmer"
Added marketplace `kanmer-plugins` from \\?\…\kanmer.                    EXIT=0
```

**Implication.** The argument the marketplace command needs is the *marketplace*
root, not the *plugin* root, and the two are related by exactly two path
segments (`<marketplaceRoot>/plugins/kanmer`) in both dev and packaged layouts.
Deriving one from the other keeps them from drifting apart again.

## Finding 2 — codex's install is missing its second command entirely

`marketplaceCommands` for codex (`providers.ts:636`) is a single
`codex plugin marketplace add`. Adding the marketplace does **not** install the
plugin — codex says so itself:

```
$ codex plugin list
PLUGIN                 STATUS         VERSION  PATH
kanmer@kanmer-plugins  not installed           …\kanmer\plugins\kanmer
```

codex's verb is `add`, not `install` (`codex plugin --help` → `add  Install a
plugin from a configured marketplace snapshot`; there is no `install`
subcommand). With it:

```
$ codex plugin add kanmer@kanmer-plugins
Added plugin `kanmer` from marketplace `kanmer-plugins`.
Installed plugin root: …\plugins\cache\kanmer-plugins\kanmer\0.3.2         EXIT=0
$ codex plugin list
kanmer@kanmer-plugins  installed, enabled  0.3.2
```

**Mechanism for the skills, not a listing.** codex's own model was asked what it
has:

```
$ codex exec --skip-git-repo-check --dangerously-bypass-approvals-and-sandbox \
    "List the exact names of every skill available to you whose name begins with
     'kanmer-'. Output only the names, comma separated, nothing else."
kanmer-auto, kanmer-closeout, kanmer-docs, kanmer-execute, kanmer-groom,
kanmer-plan, kanmer-report, kanmer-research, kanmer-review, kanmer-setup,
kanmer-tickets, kanmer-verify                                             EXIT=0
```

Twelve skills, loaded into a codex session by the plugin install.

**This is in scope and does not pre-empt [[MCP-016]].** MCP-016 owns whether the
plugin should keep advertising an **MCP server** codex cannot launch. Skills are
the other half of the same install and they demonstrably do work; the missing
`codex plugin add` is the same defect as Finding 1 — an install command that does
not install — not the product decision MCP-016 holds. Note also that the cache
path is now `…\kanmer\0.3.2`, so MCP-011's version bump is live and the version
interaction the brief flagged is already resolved.

## Finding 3 — the packaged app CAN carry a local marketplace: a packaging fix, not a product decision

`electron-builder.yml:17-23` ships `mcp/kanmer-mcp.cjs` and `plugins/kanmer`, and
its comment claims the latter gives Connect "a local marketplace source". It does
not: the manifests are at the repo root and neither is packed. The v2 plan
required both explicitly —

> `docs/plans/kanmer-v2/phase-6-agents-connect/plan.md:30` — "ship
> `plugins/kanmer/` (+ **the two marketplace JSONs**) in `electron-builder.yml`
> `extraResources` … so the packaged app has a real local marketplace source"

and `git log -L 15,25:apps/gui/electron-builder.yml` shows `0f3bb03` adding the
plugin directory and the comment while dropping the parenthesis. A written
decision, half-implemented.

**The question the brief said to stop and ask about — whether a packaged app can
use a local marketplace at all — is answered yes, by running it.** A faithful
mirror of the *proposed* packaged `resources/` layout was built in scratch
(`resources/.claude-plugin/marketplace.json`,
`resources/.agents/plugins/marketplace.json`, `resources/plugins/kanmer/`,
`resources/mcp/kanmer-mcp.cjs`, plus a dummy `app.asar` so the directory is not
artificially tidy) and both hosts installed from it:

```
$ claude plugin uninstall kanmer@kanmer                 ✔  EXIT=0   (fresh start)
$ claude plugin marketplace add "<scratch>\resources"   ✔  EXIT=0
$ claude plugin install kanmer@kanmer
✔ Successfully installed plugin: kanmer@kanmer (scope: user)             EXIT=0

$ claude -p "Call mcp__plugin_kanmer_kanmer__get_status …"
server.path: <scratch>\resources\plugins\kanmer\mcp\kanmer-mcp.cjs
server.build: plugin      rootSource: cwd-worktree      tickets: 157      EXIT=0
```

```
$ codex plugin marketplace add "<scratch>\resources"
Added marketplace `kanmer-plugins` from \\?\<scratch>\resources.         EXIT=0
$ codex plugin add kanmer@kanmer-plugins
Installed plugin root: …\cache\kanmer-plugins\kanmer\0.3.2               EXIT=0
```

The tool answered **from inside the simulated resources tree**. So there is no
product decision to escalate: shipping the two JSONs into `resources/` makes the
packaged app a working marketplace source, and the `./plugins/kanmer` relative
`source` in each manifest resolves correctly there because the packed layout
preserves the same two segments.

## Finding 4 — making failures loud is safe: every re-run exits 0

The reason a loud failure could be worse than a silent one is a benign non-zero
on the second Connect. Measured; there is none.

| re-run | output | exit |
|---|---|---|
| `claude plugin marketplace add <same path>` | `✔ Marketplace 'kanmer' already on disk` | **0** |
| `claude plugin install kanmer@kanmer` (2nd) | `✔ Plugin "kanmer@kanmer" is already installed` | **0** |
| `claude plugin marketplace add <different valid path, same name>` | `✔ Successfully added marketplace: kanmer` | **0** |
| `codex plugin marketplace add <same path>` | `Marketplace 'kanmer-plugins' is already added` | **0** |
| `codex plugin add kanmer@kanmer-plugins` (2nd) | `Added plugin 'kanmer' …` | **0** |

The third row is the one that matters for packaging: a user who added the
marketplace from a repo checkout and later Connects from the installed app
re-points it cleanly rather than colliding. **Surfacing non-zero exits therefore
cannot produce a false failure on any idempotent path measured here.**

## Finding 5 — the two marketplace names must stay different; the two `${…}_ROOT` variables no longer disagree

**Names.** They are two different files in two different schemas read by two
different hosts: `.claude-plugin/marketplace.json` (Claude's schema — `owner`,
`plugins[].source` a string) declares `kanmer`;
`.agents/plugins/marketplace.json` (the agents schema — `interface`, `policy`,
`plugins[].source` an object) declares `kanmer-plugins`. Both are live and both
were exercised above. Renaming one buys nothing a caller can use — each host only
ever sees its own file — and would move codex's cache directory for every
existing user. FRD-012 R2 already records that "the two names legitimately
differ"; this ticket confirms it by measurement rather than changing it. What is
missing is not agreement but a **rail**: `providers.ts` hard-codes `kanmer@kanmer`
and would hard-code `kanmer@kanmer-plugins`, and nothing today ties either string
to the manifest that defines it.

**Variables.** The ticket's defect 5 (`.mcp.json` using `${PLUGIN_ROOT}`) was
**already fixed by MCP-011** and must not be re-opened. Current state on disk:
`mcp/claude.mcp.json` uses `${CLAUDE_PLUGIN_ROOT}` + `${KANMER_NODE:-node}`;
`.mcp.json` is token-free with `"cwd": "."`. `check-plugin-sync.mjs:206-296` pins
both shapes and fails if either drifts. MCP-011 established that the two files
*cannot* be unified — a relative `cwd` collapses grok's handshake, and codex
expands no token — so this is a closed question, correctly closed.

## Finding 6 — where the swallow is, and what the UI does with a failure

`installSkills` (`connect.ts:294-306`) catches every marketplace command failure
into the note `plugin cmd skipped (<first line>)`, and `connectAgent` then folds
that string into a **successful** result (`ok: true`, line 443). The renderer
(`Settings.tsx:443-457`) renders `ok: true` as `✓ Connected …` and only shows the
command block and `result.output` when `ok` is false. So the user sees a tick.

The fix has a shape the UI already supports: on a marketplace failure return
`ok: false` with `command` set to the **failing** command, which
`Settings.tsx:446-455` renders as "Run this yourself:" with a copy button — this
is FRD-012 AC-4's copy-paste fallback, which the marketplace path has never
honoured.

## Out of scope — recorded, not fixed

- **[[MCP-016]]** owns whether the plugin should keep advertising an MCP server
  for codex/`agy`. Nothing here changes `.mcp.json`, `.codex-plugin/plugin.json`
  or `.claude-plugin/plugin.json`. Adding `codex plugin add` delivers *skills*,
  which MCP-016 explicitly treats as working; it does not decide MCP-016.
- **grok / opencode / antigravity** stay on the copy-skills path (MCP-014,
  MCP-015).
- `kanmerGit.test.ts` Windows flake — pre-existing, GUI-085/GUI-089.

## Reversibility

Every probe ran under `CLAUDE_CONFIG_DIR`/`CODEX_HOME` redirected into scratch or
a throwaway directory. Restoration verified afterwards with the environment
variables unset: the real `claude plugin marketplace list` shows only
`claude-plugins-official` and no `kanmer`; the real `codex plugin marketplace
list` shows no `kanmer-plugins`; both throwaway codex homes deleted
(`Test-Path` → `False`, `False`). `git status --porcelain` shows no repo file
touched by this research.
