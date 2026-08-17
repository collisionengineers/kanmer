# MCP-013 — Proof, on merged `main`

Merged as **`f5c370e`** (PR #60, squash), verified from the **main checkout** at
`6dbb284` (`f5c370e` confirmed an ancestor: `git merge-base --is-ancestor
f5c370e HEAD` → 0). Windows 11, `claude` 2.1.233, `codex` 0.147.0, node v24.14.0.

Every install below ran in an **isolated profile** with a control proving it was
empty first, and the machine state was restored and the restore verified at the
end. **No claim rests on an install success line** — that is precisely the proxy
that hid this bug for three releases; the claims rest on a tool answering and on
a host reporting the skills it loaded.

---

## 1. The rail

| Command | Result |
|---|---|
| `npm run plugin:check` | ✔ `marketplaces: kanmer, kanmer-plugins — both packed into the app` / `plugin-sync OK — 30 tools match, bundle bytes match, 12 skill frontmatters parse, manifests at v0.3.2` |
| `npm run typecheck` | ✔ clean, all four workspaces |
| `npm run verify:agents-block` | ✔ 28/28 |
| `npm run verify:skills` | ✔ ALL CHECKS PASSED |
| `npm test` | 34 test files, 1 pre-existing flake (below) |

**`plugin:check` was run from the MAIN CHECKOUT**, which is the only place it can
mean anything: it refuses inside a linked worktree by design (MCP-007), because a
worktree has no `node_modules` of its own and both sides of the bundle-byte
comparison would be built the same wrong way. This was the one rail not settled
pre-merge, and it is green here after a real `npm run build`.

### Two `npm test` results that are not this ticket's, each attributed

1. **`Cannot find package 'jsdom'`** on the first run. `jsdom` was added to
   `apps/gui/package.json` by **`6dbb284` (GUI-065, PR #61)** — traced with
   `git log -S"jsdom"` — which merged **after** `f5c370e`. The failing file
   (`UpdateBanner.test.tsx`) did not exist at this ticket's merge commit. Fixed
   by `npm install`; `package-lock.json` already carried it and was not modified
   (`git status --porcelain` shows only two untracked images).
2. **`kanmerGit.test.ts`** — the known Windows flake (GUI-085/GUI-089). Shown to
   be a flake rather than a regression: run 1 of the file alone failed
   `refuses a name that is already taken` + `moves a worktree left on the old
   branch`, i.e. **different tests than the full-suite run**, and run 2 of the
   same file passed clean. Non-deterministic, and MCP-013 touches no git code.
   Not chased, per the ticket's standing instruction.

---

## 2. Claude Code — the defect, the fix, and the mechanism

```
$ $env:CLAUDE_CONFIG_DIR = "<scratch>\verifyprofile"
$ claude plugin marketplace list
No marketplaces configured                                            ← control

# NEGATIVE CONTROL — the argument Connect used to pass, still failing today:
$ claude plugin marketplace add "C:\Users\PC\Documents\GitHub\kanmer\plugins\kanmer"
✘ Failed to add marketplace: Marketplace file not found at
  C:\…\kanmer\plugins\kanmer\.claude-plugin\marketplace.json          EXIT=1

# What connect.ts computes on merged main (marketplaceRoot()):
$ claude plugin marketplace add "C:\Users\PC\Documents\GitHub\kanmer"
✔ Successfully added marketplace: kanmer (declared in user settings)  EXIT=0
$ claude plugin install kanmer@kanmer
✔ Successfully installed plugin: kanmer@kanmer (scope: user)          EXIT=0
```

The negative control is kept deliberately: it is what makes the passing result
attributable to the change rather than to the environment.

**The mechanism — the tool was called:**

```
$ claude -p "Call mcp__plugin_kanmer_kanmer__get_status … print server.build,
             server.version, server.path, rootSource, exists, ticket count"
plugin
0.3.2
C:\Users\PC\Documents\GitHub\kanmer\plugins\kanmer\mcp\kanmer-mcp.cjs
cwd-worktree
true
160                                                                    EXIT=0
```

`build: plugin` — served by the plugin-installed copy, not a dev path — and the
project's real board, 160 tickets.

## 3. codex — including the second command that was missing entirely

```
$ $env:CODEX_HOME = "<throwaway>"
$ codex plugin marketplace list
No plugin marketplaces in scope.                                       ← control

$ codex plugin marketplace add "…\kanmer\plugins\kanmer"          ← negative control
Error: invalid marketplace file `\\?\…\plugins\kanmer`:
       marketplace root does not contain a supported manifest          EXIT=1

$ codex plugin marketplace add "C:\Users\PC\Documents\GitHub\kanmer"
Added marketplace `kanmer-plugins`                                     EXIT=0
$ codex plugin add kanmer@kanmer-plugins
Added plugin `kanmer` from marketplace `kanmer-plugins`.
Installed plugin root: …\cache\kanmer-plugins\kanmer\0.3.2             EXIT=0
$ codex plugin list
kanmer@kanmer-plugins  installed, enabled  0.3.2
```

Before this ticket the second command did not exist in `providers.ts`, so this
listing read `not installed` after a Connect that reported success.

**The mechanism — codex reporting what it actually loaded, not a file listing:**

```
$ codex exec --skip-git-repo-check --dangerously-bypass-approvals-and-sandbox \
    "List the exact names of every skill available to you whose name begins with
     'kanmer-'. Output only the names, comma separated, nothing else."
kanmer-auto, kanmer-closeout, kanmer-docs, kanmer-execute, kanmer-groom,
kanmer-plan, kanmer-report, kanmer-research, kanmer-review, kanmer-setup,
kanmer-tickets, kanmer-verify                                          EXIT=0
```

All 12. Note the cache path is `…\kanmer\0.3.2`, so MCP-011's version bump is
live — the frozen `0.1.0` the brief flagged as interacting with this path is
already resolved.

## 4. The packaged app — the third defect, checked as an artifact layout

`resources/` was assembled **exactly as merged main's `extraResources` block
specifies** — `mcp/kanmer-mcp.cjs`, `plugins/kanmer`, and, new in this ticket,
`.claude-plugin/marketplace.json` and `.agents/plugins/marketplace.json`:

```
resources\.agents\plugins\marketplace.json
resources\.claude-plugin\marketplace.json
```

```
$ claude plugin uninstall kanmer@kanmer          ✔                     EXIT=0
$ claude plugin marketplace add "<scratch>\pkgres"
✔ Successfully added marketplace: kanmer                               EXIT=0
$ claude plugin install kanmer@kanmer
✔ Successfully installed plugin: kanmer@kanmer                         EXIT=0

$ claude -p "Call mcp__plugin_kanmer_kanmer__get_status … server.path,
             server.build, ticket count"
<scratch>\pkgres\plugins\kanmer\mcp\kanmer-mcp.cjs
plugin
160
```

The tool answered **from inside the packaged layout**. Before this ticket that
directory would have held no marketplace manifest and the first command would
have exited 1 — which is what the packaged app shipped, while a comment in
`electron-builder.yml` said otherwise. `check-updater-package.mjs`'s new check 7
asserts the same three entries in the real packed output under `dist:check`.

## 5. Against the ticket's own verification list

- [x] **`marketplace add` + `install` succeed from a clean profile, commands and
      output recorded** — §2 and §3, with the negative control retained.
- [x] **The same from the packaged app, not only the repo checkout** — §4,
      against a faithful mirror of merged main's `extraResources` layout, proven
      by a tool call rather than an install message.
- [x] **A failing install command produces a visible error, asserted by a test
      with a deliberately broken path** — `connect.test.ts`, driven through the
      **real** `exec` against subprocesses that really exit non-zero (a stubbed
      runner would let code that swallows a genuine child-process rejection
      pass). Demonstrated to catch the defect: restoring the swallow turns 3 of
      them red with `expected true to be false`; restoring `pluginRoot()` as the
      argument turns the invariant test red.
- [x] **Marketplace names and plugin-root variables agree across every manifest
      and `providers.ts`, or the disagreement is documented with its reason** —
      the names **legitimately differ** and stay different (different schemas,
      different hosts, and a rename would relocate every existing codex user's
      plugin cache); documented in FRD-012 R2 and railed by `providers.test.ts`,
      which pins each hard-coded `<plugin>@<marketplace>` string to the manifest
      that declares it, and by `plugin:check`, which fails if the two names ever
      collapse into one. The `${…}_ROOT` half was **already closed by MCP-011**
      and was deliberately not reopened.

## 6. Reversibility — machine state restored and the restore verified

Every probe ran under a redirected `CLAUDE_CONFIG_DIR` / `CODEX_HOME`. Afterwards
the plugin and marketplace were uninstalled from the scratch profile, the
throwaway codex home deleted, and, with both variables unset:

```
$ claude plugin marketplace list        → only claude-plugins-official
$ claude plugin list | Select-String kanmer   → 0 matches
$ codex plugin marketplace list | Select-String kanmer → 0 matches
Test-Path ~\.codex-mcp013-proof         → False
```

The real profiles never held a Kanmer marketplace at any point. The main
checkout's only working-tree change is `npm install` populating `node_modules`
for GUI-065's new dependency; `git status --porcelain` shows two pre-existing
untracked images and nothing else.

## 7. Governing docs

**FRD-012** — R2's Claude and codex bullets are rewritten to record what shipped
(each with the command that established it), a third bullet records the packaged
case, and MCP-013 is removed from the closing open-work list. **AC-4** (a failed
command yields the exact copy-paste fallback) is newly satisfied for the two
marketplace hosts; `Settings.tsx:443-457` renders `ok: false` as "Run this
yourself:" with the failing command and a copy button, and `.connect-out` carries
`white-space: pre-wrap` so the multi-line reason survives. **R5** (ADR-0009's
method clause) is the method above. **R6/R7 unedited** — MCP-011's, confirmed by
the diff.

**[[MCP-016]] untouched and still open.** Installing codex's *skills* does not
decide whether the plugin should keep advertising an *MCP server* codex cannot
launch; FRD-012's codex bullet says so explicitly.

**No new ADR.** The path fix restores a stated invariant, the packaging
implements a written v2 decision, and the error surfacing implements an existing
acceptance criterion.
