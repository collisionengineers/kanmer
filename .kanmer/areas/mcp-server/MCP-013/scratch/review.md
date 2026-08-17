# MCP-013 — Review of PR #60

**I am both the author and the reviewer of this PR.** This is not an independent
review and should not be read as one. What it can honestly offer is a second pass
over the diff against the report and the governing docs, with what it actually
checked stated.

## 1. Changes (in the reviewer's words)

**`apps/gui/src/main/connect.ts`** — `pluginRoot()` gains an export and
`marketplaceRoot()` appears beside it as `resolve(pluginRoot(), "..", "..")`.
`installSkills` stops returning a bare note string and returns
`{ note, failure }`; its marketplace loop now **returns on the first failure**
rather than continuing, carrying the command and a new `commandFailureText()`
rendering of what the process actually said. `connectAgent` and `updateSkills`
each map a non-null `failure` to `ok: false` with the failing command as
`ConnectResult.command`. `connectAgent`'s `.catch()` — which previously turned
any throw from the **copySkills** branch into a note on an `ok: true` result —
now produces a `failure` too.

**`providers.ts`** — `InstallSpec`'s parameter is renamed `localDir` →
`marketplaceRoot` with a doc comment; codex gains a second command
`codex plugin add kanmer@kanmer-plugins`.

**`electron-builder.yml`** — two `extraResources` entries added, packing both
marketplace manifests at their repo-relative paths; the comment that claimed a
local marketplace source is replaced with one that describes what is there.

**Tests** — 7 in `connect.test.ts` (a `vi.mock("./providers.js")` that overrides
only `providerById`, and only for ids the real registry does not know), 7 in
`providers.test.ts`. **Scripts** — `checkMarketplaces()` in
`check-plugin-sync.mjs`; check 7 in `check-updater-package.mjs`.
**FRD-012** — R2's two marketplace bullets rewritten, a third added, MCP-013
removed from the open-work list.

## 2. Comments

1. **(non-blocking, verified rather than raised)** The failure `output` is
   multi-line. If `.connect-out` did not preserve newlines the user-facing half
   of this fix would be a wall of run-together text. Checked:
   `styles.css:1276-1282` sets `white-space: pre-wrap`. Fine as written.
2. **(non-blocking, verified)** `ok: false` now means "registered, but skills
   failed" as well as "nothing worked". Checked `Settings.tsx:443-457`: the
   false branch prints "Couldn't connect …  Run this yourself:" plus the command
   and output. The output leads with `Registered Kanmer in …`, so the panel does
   not claim the registration failed. Acceptable; the alternative (a third state)
   would need a renderer change this ticket does not need.
3. **(blocking → fixed in PR)** `providers.test.ts`'s check-on-the-check was
   weak: it asserted `"codex plugin add kanmer@kanmer"` does not *contain*
   `"kanmer@kanmer-plugins"`, which is true of any shorter string and would pass
   with the real assertion deleted. Rewritten to run the **same predicate** the
   real assertions use, showing it returns `true` for Claude's commands against
   Claude's manifest and `false` against codex's. Re-run: 62 passed.
4. **(non-blocking)** The copySkills swallow fix is beyond the ticket's letter.
   It is one branch over from the defect the ticket names, is the same defect,
   and is called out in the report rather than absorbed silently. Kept.
5. **(non-blocking, filed nowhere by design)** `plugin:check` could not be run
   from the worktree (MCP-007 refuses, correctly). Exercised against a mirrored
   non-worktree copy of the tree, with the pre-existing bundle-byte comparison
   satisfied artificially because that half needs the main checkout's
   `node_modules`. Nothing in this diff touches the bundle. The real run is
   verify's, from the main checkout, and the report says so.
6. **(non-blocking)** codex gaining an install command could be read as touching
   MCP-016. It does not: MCP-016's question is whether the plugin should
   advertise an **MCP server** codex cannot launch. This installs **skills**,
   which MCP-016's own body treats as the working half. MCP-016 remains open and
   untouched, and both the commit message and FRD-012 say so.

## 3. Disposition

| Comment | Disposition |
|---|---|
| 1, 2 | checked, no change needed — recorded so the check is not repeated |
| 3 | **fixed in PR** (`providers.test.ts` check-on-the-check rewritten) |
| 4 | kept, disclosed in the report |
| 5 | deferred to verify **by design**, not an omission |
| 6 | won't-do — out of scope on purpose |

## 4. Checks performed

- **Report against diff** — every file in `git diff --name-only` appears in the
  report's table with a rationale, and no file is in the report that is not in
  the diff. Matches.
- **Governing docs** — the plan's Governing-docs section claimed FRD-012 R2 +
  AC-4 closed, R6/R7 untouched, no new ADR. Verified against the diff:
  `docs/functional/frd/FRD-012-connect.md` changes R2's bullets and the closing
  paragraph only; `git diff` shows **no** edit to R6, R7, `plugins/kanmer/**`, or
  any ADR. The claim holds.
- **`files` document's ripple list** — every listed file was touched;
  `InstallSpec`'s rename has exactly one call site and typecheck is clean; no
  renderer change was needed, as predicted; no plugin rebuild was needed because
  nothing under `plugins/kanmer/` changed (confirmed by the diff's file list).
- **Open questions** — read before any fix. Nothing unticked above
  `## Parked`; the one fix applied (comment 3) turns on no open question.
- **The evidence** — the negative control (the old argument still exiting 1 on
  this branch) is present for both hosts, so the passing result is attributable
  to the change rather than to the environment. Both success claims are tool
  calls, not install messages. The packaged claim was established on a mirror of
  the layout **before** the layout was changed.
- **Rails** — `npm test` ✔, `npm run typecheck` ✔, `verify:agents-block` ✔ 28/28,
  `verify:skills` ✔. `git diff AGENTS.md` empty.

## 5. Verdict

**PASS** — with the author/reviewer caveat in the first line, and with comment 3
fixed in the PR rather than filed. Merging and moving to Verifying, where
`plugin:check` from the main checkout and a fresh clean-profile install of merged
main are the outstanding checks.
