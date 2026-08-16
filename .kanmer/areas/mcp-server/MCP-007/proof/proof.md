# Proof — MCP-007

Verified on **merged `main`** in the main checkout
(`C:/Users/PC/Documents/GitHub/kanmer`), after `git pull --ff-only`.

- Merge commit: **`bc8cde1`** — "Make plugin:check refuse to validate a bundle
  built inside a worktree (MCP-007) (#48)"
- Branch commits squashed into it: `aa16afc`, `c6120b9`
- `main` at verification time: `19244f6` (DOC-007 landed on top; unrelated)
- Proof type: **command-log**. There is no CI (`.github/workflows` does not
  exist), so this is the whole of the automated story for `scripts/`.

## 1. What actually merged

```
$ git show --stat bc8cde1
 AGENTS.md                                         |  6 +-
 docs/functional/frd/FRD-022-mcp-server-surface.md |  2 +-
 scripts/check-plugin-sync.mjs                     | 67 ++++++++++++++++++++++-
 3 files changed, 70 insertions(+), 5 deletions(-)

$ git show --name-only bc8cde1 | grep kanmer-mcp.cjs
(no match)
```

**`plugins/kanmer/mcp/kanmer-mcp.cjs` is absent from the merge**, as required —
this ticket changed no server or core source, so the committed bundle was
already correct and must not have been touched.

## 2. The guard REFUSES inside a worktree

A **fresh** worktree cut from merged `origin/main`, not the development one:

```
$ git worktree add .worktrees/mcp-007-verify --detach origin/main
HEAD is now at 19244f6 …

$ cd .worktrees/mcp-007-verify
$ git rev-parse --git-dir
C:/Users/PC/Documents/GitHub/kanmer/.git/worktrees/mcp-007-verify
$ git rev-parse --git-common-dir
C:/Users/PC/Documents/GitHub/kanmer/.git

$ npm run plugin:check
> kanmer@0.3.2 plugin:check
> node scripts/check-plugin-sync.mjs

plugin:check refused: this is a linked git worktree (C:\Users\PC\Documents\GitHub\kanmer\.worktrees\mcp-007-verify), where the bundle check cannot mean anything — a worktree has no node_modules of its own, so @kanmer/core resolves up to the main checkout and the committed bundle and the fresh build are produced the same wrong way, agree, and pass
  fix: run `npm run plugin:check` from the main checkout instead (the repo root that owns node_modules); if the committed bundle needs refreshing, `npm run plugin:build` there too
```

Exit codes captured without a pipe, since the refusal has to be *fatal*, not just
loud:

```
$ node scripts/check-plugin-sync.mjs > /dev/null 2>&1 ; echo $?
1
$ npm run plugin:check > /dev/null 2>&1 ; echo $?
1
```

Ticket verification bullet 1 ✅ — fails, and the message names both the cause and
the fix.

## 3. The guard PASSES at the repo root

```
$ git rev-parse --git-dir
.git
$ git rev-parse --git-common-dir
.git

$ npm run build
CJS dist\standalone\kanmer-mcp.cjs 1.41 MB
CJS ⚡️ Build success in 404ms

$ npm run plugin:check
> node scripts/check-plugin-sync.mjs

plugin-sync OK — 29 tools match, bundle bytes match, 12 skill frontmatters parse
exit=0
```

Ticket verification bullet 2 ✅ — unchanged at the root, all three of the
script's checks (tool names, bundle bytes, SKILL-018 frontmatter) still run and
still pass. The guard is a no-op here.

## 4. The `git`-off-PATH fallback

Not asserted — exercised. In the fresh worktree, with `git` unreachable:

```
$ env PATH="/nonexistent" "/c/Program Files/nodejs/node" scripts/check-plugin-sync.mjs
plugin:check refused: this is a linked git worktree (…\.worktrees\mcp-007-verify), …
exit=1
```

and the raw signal it falls back to agrees with the primary one in both
directions:

```
$ node -e "console.log(require('node:fs').statSync('.git').isFile())"
false     # main checkout
true      # worktree
```

A non-git directory (a copy of the script in a scratch folder) is silent and does
**not** refuse — it falls through to the script's normal `Missing file:` error,
confirming the second `catch` returns `false` rather than over-refusing.

## 5. The release rail is unaffected

Ticket verification bullet 4. `scripts/release.mjs` invokes `plugin:check` at two
points — in the `GATE` array (line 215) and again after the post-bump rebuild
(line 303) — both through `run()`:

```js
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");   // :33
function run(command, cwd = root) { … }                                // :94
```

`cwd` defaults to the repo root, so a root-derived guard can never fire there.
Confirmed by reading the *current* `release.mjs`, which GUI-066 rewrote while
this ticket was in flight, rather than the version the research read.

Corroborating, since the release gate also runs it:

```
$ npm run verify:agents-block
26/26 checks passed
```

— so the three AGENTS.md edits did not disturb the machine-checked managed block.

## 6. Rail on merged main

```
$ npm test
@kanmer/core   Test Files  9 passed (9)     Tests 193 passed (193)
@kanmer/gui    Test Files 21 passed (21)    Tests 236 passed (236)
test:scripts   pass 41   fail 0

$ npm run typecheck
> @kanmer/core@0.1.0 typecheck      ✅
> @kanmer/mcp-server@0.1.0 typecheck ✅
> @kanmer/ui@0.2.0 typecheck         ✅
> @kanmer/gui@0.3.2 typecheck        ✅
exit 0
```

All four workspaces named and clean. `apps/gui`'s `kanmerGit.test.ts` — flagged
as an intermittent 5s-timeout flake under concurrent agent load — passed here and
in the two full-suite runs on the branch; it failed once mid-ticket and passed
7/7 in 29.9s on a solo rerun with `--testTimeout=30000`. Not a regression from
this change, which touches no GUI code.

## Ticket verification bullets

- ✅ **1.** `plugin:check` inside a worktree fails with a message naming cause and fix — §2.
- ✅ **2.** The same command at the repo root is unchanged — §3.
- ⚠️ **3.** "Reproduce the original failure: change `packages/core` in a worktree,
  run `plugin:build`, confirm the guard fires." **Not run, and correctly so** —
  the operator's answer to Q1 was option (c): `plugin:build` stays **unguarded**.
  This bullet was written before that decision and describes a build-time guard
  the ticket deliberately does not ship. The equivalent under the shipped scope
  is §2: the artifact can still be produced in a worktree, it can no longer be
  *validated* there. Recorded rather than quietly dropped.
- ✅ **4.** `release.mjs` still passes at the root — §5.

## Not covered

No unit test for `isLinkedWorktree`. `origin/main` gained
`test:scripts` → `node --test "scripts/*.test.mjs"` via GUI-066 *during* this
ticket, so the "nothing covers `scripts/`" premise the plan was written on
expired mid-flight; the guard is a good candidate now that there is somewhere to
put it. The operator specified a hand-run log for this ticket, both branches of
the guard are exercised above including the fallback, and a test asserting "we
are not in a worktree" is awkward to write from inside one. Left as a follow-up
in the post-implementation report, not filed as a ticket.
