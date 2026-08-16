# Proof — SKILL-011

PR [#31](https://github.com/collisionengineers/kanmer/pull/31), merged
(`ba16d2e`), plus follow-up PR
[#32](https://github.com/collisionengineers/kanmer/pull/32) (`9658d08`), which
this document exists partly to explain.

## What #31 got wrong, found after merge

**The merged plugin bundle did not contain the feature the PR shipped.** Stated
first, because the rail reported green throughout and the report claimed the
bundle was regenerated.

The bundle was built inside `.worktrees/skill-011`. A worktree has no
`node_modules` of its own, so `@kanmer/core` resolves *up* to the main
checkout's workspace symlink, and `tsup` bundled **main's** core:

```
$ ls -d .worktrees/skill-011/node_modules
No such file or directory

$ grep -c filter.group .worktrees/skill-011/packages/core/dist/index.js
1                                    <- the worktree's own core HAS the change
$ grep -c filter.group .worktrees/skill-011/plugins/kanmer/mcp/kanmer-mcp.cjs
0                                    <- the bundle built from it does NOT
```

Nothing caught it. `vitest` runs from `src` and never touches the bundle.
`plugin:check` compares the committed artifact to a fresh build — inside the
worktree both were made the same wrong way, so it was self-consistent and
passed. The only tell is the embedded path comments switching from
`../../node_modules` to `../../../../node_modules`.

It failed the first time `plugin:check` ran at the repo root, which was after
merge. `#32` rebuilt at the root, added the trap to AGENTS.md §8 gotcha 8, and
[[MCP-007]] is filed to make `plugin:check` refuse rather than pass meaninglessly
when run from a worktree — because prose is the weakest fix available and every
future core change worked in a worktree hits this.

## The shipped bundle now carries the feature

```
$ grep -c filter.group plugins/kanmer/mcp/kanmer-mcp.cjs
1
$ npm run plugin:check
plugin-sync OK — 29 tools match, bundle bytes match
```

`command-log`. Read from the committed artifact on merged `main`, not from a
build, because trusting the build is precisely the mistake above.

## The feature, demonstrated on the real board

```
list_items({ group: "HZN-003" }) -> 15 items

id         profile   status        taken
---------- --------- ------------- -----
DOC-007    feature   backlog       -
GUI-065    fix       backlog       -
GUI-067    chore     backlog       -
…
SKILL-011  feature   implementing  claude-code@skill-011-group-scoping

get_group("HZN-003") member fields: ["id","title","status","archived"]
  profile present? false
  taken   present? false

AND composition — group HZN-003 + area gui -> 10 items
unknown group HZN-999 -> 0 items (no throw)
control — no filter -> 121 items (unchanged path)
```

Three claims in one run:

1. The filter returns exactly the group's members.
2. Those summaries carry `profile` and `taken`; `get_group`'s derived members
   carry **neither**. That contrast is the whole argument for putting the
   resolution in the tool rather than the skill — it is not a preference, it is
   the difference between a roster kanmer-auto can partition and one it cannot.
3. Three profiles in a single roster (`feature`/`fix`/`chore`) is exactly what
   FRD-023 R2 partitioning consumes.

AND composition, the unknown-group case, and the unfiltered control all behave
as specified.

## Rail, on merged `main` (`9658d08`)

```
npm test                     201 passed (21 files) — 5 new
npm run smoke:protocol       26/26 checks passed
npm run plugin:check         29 tools match, bundle bytes match
npm run verify:agents-block  26/26 checks passed
npm run typecheck -w @kanmer/gui   clean
npm run build                clean
```

## What this run does NOT prove

- **`kanmer-auto` has not been run against a group end to end.** The tool half
  is proven above; the skill half is prose that no test exercises. The first
  real burn-down of HZN-003 is its first genuine test.
- **There is no root `typecheck` script.** The plan called for one. The root
  package defines build/test/smoke/plugin/release and no typecheck at all, so
  only the GUI workspace was typechecked. [[GUI-067]] reads "make the root
  typecheck cover every workspace", which understates it — there is nothing to
  extend, only something to create. That correction belongs on GUI-067 before it
  is worked.
- **The `blocked` drop rule remains unqueryable.** It is derived on summaries,
  not a filter, so kanmer-auto drops those tickets after the call as it already
  does for `taken`. Unchanged by this ticket, and noted so §1 is not misread.

---

**Merged:** PR #31 (`ba16d2e`), PR #32 (`9658d08`). Follow-up: [[MCP-007]].
