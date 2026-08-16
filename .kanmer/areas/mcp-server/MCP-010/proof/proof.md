# Proof — MCP-010

*The proof. Not the report — this is **evidence from merged `main`**, not a description of what was built.*

Verified on merged `main` at **`741ef81`** ("Resolve the board when no --root is
given (MCP-010) (#40)"), PR
<https://github.com/collisionengineers/kanmer/pull/40>.

**Where it was run, and why that matters.** Not in the ticket worktree, and not
in the shared main checkout — that checkout had another agent's uncommitted
`AGENTS.md` and could not be fast-forwarded without touching their work. Instead
a **dedicated detached checkout of `741ef81`**, outside the repo tree, with its
own `npm install` from the lockfile. That is deliberate rather than incidental:
the one claim this ticket could not certify pre-merge was the committed bundle's
bytes, because the bundle had been built in a worktree. A clean checkout with
freshly resolved `node_modules` is the independent environment that settles it.

## What was verified

- **The ticket's central claim.** The server, invoked exactly as both plugin
  manifests do — no `--root`, cwd at the repo root — finds the board that lives
  at `.worktrees/kanmer`, and says how it found it.
- **The not-found path is fatal and names every path tried**, with all three
  recoveries.
- **The committed plugin bundle is byte-current**, checked against a fresh build
  in an environment that had nothing to do with the one that produced it.
- The unit tests, both existing smoke suites, the new one, typecheck, the
  AGENTS.md block, and the manual.

## Evidence

### 1. The before/after pair — the ticket's actual claim

**BEFORE**, captured on unmodified `main` (`5d0e0d7`) *before* any code changed,
and preserved in `scratch/falsification.md`. Same script, no `--root`,
cwd = `C:\Users\PC\Documents\GitHub\kanmer`, `KANMER_ROOT` stripped:

```
stderr: kanmer-mcp ready — root: C:\Users\PC\Documents\GitHub\kanmer

get_status:
{
  "projectRoot": "C:\\Users\\PC\\Documents\\GitHub\\kanmer",
  "kanmerDir":   "C:\\Users\\PC\\Documents\\GitHub\\kanmer\\.kanmer",
  "exists": false,
  "boardSource": "default",
  "counts": { "byStage": { "backlog": 0, "preparing": 0, "implementing": 0,
                           "review": 0, "verifying": 0, "done": 0 },
              "byType": {} },
  "warningsCount": 0
}
```

Exit 0. The server called itself "ready" and returned a plausible empty board.
There is no `rootSource` field because there was no answer to give.

**AFTER**, on merged `main` (`741ef81`), same script, same flags, same cwd:

```
stderr: kanmer-mcp ready — root: C:\Users\PC\Documents\GitHub\kanmer\.worktrees\kanmer (cwd-worktree)

get_status:
{
  "projectRoot": "C:\\Users\\PC\\Documents\\GitHub\\kanmer\\.worktrees\\kanmer",
  "rootSource":  "cwd-worktree",
  "kanmerDir":   "C:\\Users\\PC\\Documents\\GitHub\\kanmer\\.worktrees\\kanmer\\.kanmer",
  "exists": true,
  "format": 3,
  "boardSource": "file",
  "counts": { "byStage": { "backlog": 17, "preparing": 16, "implementing": 0,
                           "review": 0, "verifying": 2, "done": 113 },
              "byType": { "ticket": 148 }, "offBoardStage": 0,
              "archived": 1, "taken": 4 },
  "warningsCount": 0
}
```

`exists: false → true`. `boardSource: "default" → "file"`. **0 tickets → 148.**
And the answer now carries its own provenance, so it is checkable rather than
merely plausible.

### 2. The not-found diagnostic — a board-less directory, no `--root`

```
$ node <verify>/packages/mcp-server/dist/index.js     # cwd = an empty temp dir
exit code: 1
kanmer-mcp fatal: no Kanmer board found. Tried:
  C:\Users\PC\AppData\Local\Temp\nb-O3t74s\proj\.kanmer
  C:\Users\PC\AppData\Local\Temp\nb-O3t74s\proj\.worktrees\*\.kanmer
  C:\Users\PC\AppData\Local\Temp\nb-O3t74s\.kanmer
  C:\Users\PC\AppData\Local\Temp\nb-O3t74s\.worktrees\*\.kanmer
  C:\Users\PC\AppData\Local\Temp\.kanmer
  C:\Users\PC\AppData\Local\Temp\.worktrees\*\.kanmer
  C:\Users\PC\AppData\Local\.kanmer
  C:\Users\PC\AppData\Local\.worktrees\*\.kanmer
  C:\Users\PC\AppData\.kanmer
  C:\Users\PC\AppData\.worktrees\*\.kanmer
  C:\Users\PC\.kanmer
  C:\Users\PC\.worktrees\*\.kanmer
  C:\Users\.kanmer
  C:\Users\.worktrees\*\.kanmer
  C:\.kanmer
  C:\.worktrees\*\.kanmer
 Pass --root <board>, set KANMER_ROOT,
 or pass --init to create one here.
```

Every level, both probes per level, in order, terminating at the drive root —
then all three recoveries. This is the operator's preview, literally.

### 3. The bundle — the one thing review could not certify

```
$ npm run build && npm run plugin:check
> node scripts/check-plugin-sync.mjs
plugin-sync OK — 29 tools match, bundle bytes match
```

Run in the dedicated clean checkout described above, whose `node_modules` was
installed from scratch. The committed `plugins/kanmer/mcp/kanmer-mcp.cjs` is
byte-identical to a build made in an environment with no relationship to the one
that produced it — which is exactly the property a worktree build cannot claim
for itself, and the review's one open item (C7).

### 4. The rail

```
$ npm run test -w @kanmer/core
 ✓ src/discover.test.ts (11 tests) 17ms
 Test Files  9 passed (9)
      Tests  193 passed (193)

$ npm test                               # core, then gui
 Test Files  9 passed (9)     /  Tests  193 passed (193)
 Test Files  22 passed (22)   /  Tests  213 passed (213)

$ npm run typecheck                      # all four workspaces
0 errors

$ npm run smoke:discovery
PASS  no --root at the repo root finds the worktree board
PASS  ...and says how it found it  — rootSource=cwd-worktree
PASS  ...and the board actually exists  — exists=true
PASS  from inside a ticket worktree (.git is a FILE) it still finds the board
PASS  ...reported as an ancestor worktree  — rootSource=ancestor-worktree
PASS  no board anywhere exits non-zero  — exit=1
PASS  ...with the not-found diagnostic
PASS  ...naming the .kanmer path it tried
PASS  ...naming the .worktrees glob it tried
PASS  ...and all three recoveries
PASS  --init boots at cwd instead of dying
PASS  ...and says so  — rootSource=init
PASS  ...without creating .kanmer merely by booting  — exists=false
13/13 checks passed

$ node packages/mcp-server/src/smoke.mjs      120/120 checks passed
$ npm run smoke:protocol                       26/26 checks passed
$ npm run verify:agents-block                  26/26 checks passed
$ npm run check:manual                         manual: up to date (12 chapters)
```

The two decisions most likely to have been got wrong silently each have a named
check above: `smoke-discovery` case 2 is the `.git`-**file** traversal that a
"stop wherever `.git` exists" walk would have broken, run against a real
`gitdir:` pointer file on disk; and case 4's `exists=false` is what keeps
FRD-022's "reads never create `.kanmer/`" true under the new `--init` flag.

## Not covered

- **`packages/mcp-server/src/root.ts` has no unit tests.** Deliberate, and the
  reason the resolver itself lives in `@kanmer/core`: this package has no test
  runner and `FRD-022:48-49` records that absence as a decision. The composition
  layer is covered end-to-end by `smoke-discovery.mjs` cases 3 and 4 instead.
- **The `.mcpb` / Claude Desktop install is unimproved.** Its cwd is the host's
  and unrelated to any repo, so discovery cannot help it; all it inherits is the
  better error message. Tracked as [[MCP-008]].
- **The plugin manifests still do not benefit in the wild** until [[MCP-011]]
  lands — this change makes the resolver work; that one is the ticket that
  points the manifests at it. It is unblocked by this merge.
- **The GUI was audited, not tested for this change.** `connect.ts:47` always
  emits `--root <boardRoot>` and explicit roots stay unvalidated, so no GUI path
  reaches discovery. Verified by reading, and its existing `--root` tests still
  pass in the run above; no new GUI test was added because there is no new GUI
  behaviour.
- **No performance measurement** of the ancestor walk on network/UNC paths.
  Parked with a reason in `open-questions.md`.
