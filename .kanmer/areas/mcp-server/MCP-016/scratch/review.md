# Review — MCP-016 / PR #62

**I am both author and reviewer of this change. This is not an independent
review and should not be read as one.** What follows is a self-check against the
diff, the report and the governing docs, written after the fact and recording
what was actually re-examined rather than what was intended.

## Changes (reviewer's own reading of the diff)

Five paths, `6dbb284..b653a33`:

1. **`plugins/kanmer/.mcp.json` — deleted.** 22 lines, all of it the codex/`agy`
   MCP config plus its `_comment` rationale. Nothing else in the repo imports or
   copies it by name (checked: `connect.ts`, `providers.ts`, `release.mjs`,
   `build-plugin.mjs`, `check-updater-package.mjs`, `verify-release-assets.mjs`,
   `electron-builder.yml` — the last packs `plugins/kanmer` as one directory).
2. **`plugins/kanmer/.codex-plugin/plugin.json`** — `mcpServers` key gone; a
   14-line `_comment` array added at the top. `name`, `version`, `skills`,
   `interface` and the rest byte-identical.
3. **`scripts/check-plugin-sync.mjs`** — the manifest loop's second tuple becomes
   `[".codex-plugin/plugin.json", null]`, with `null` meaning "must declare no
   `mcpServers`"; a new standalone `existsSync` assertion on the deleted file; a
   new `skills === "./skills/"` assertion applied to *both* manifests; the
   `--root` loop folded into the `mcp/claude.mcp.json` branch; a new `else`
   requiring `mcp/claude.mcp.json` to exist. Comment block rewritten.
4. **`docs/functional/frd/FRD-012-connect.md`** — R2 (two bullets), R6 (two
   matrix rows + the consequences block, now three numbered items), R7 (scope
   narrowed and a disclaimer about Connect added), and the closing "Open work"
   paragraph.
5. **`README.md`** — three edits inside §"Install as a plugin".

## Comments

1. **(non-blocking, checked) Is the `null` sentinel in the manifest loop clear?**
   It reads oddly at a glance — a loop over `[manifest, mcpKey]` where one entry
   has no key. Left as is: the alternative is two loops that duplicate the
   version and skills assertions, and the two-line comment above the array states
   the convention. The failure message it produces is explicit about the ticket
   and the reason, which is what a future reader actually hits.
2. **(non-blocking, checked) Does `serverEntry` become dead?** No — still the
   only reader of `mcp/claude.mcp.json`'s entry, now called once instead of
   three times. No orphan helpers left behind.
3. **(blocking at the time, fixed in PR) Nothing asserted that the plugin still
   delivers what it does deliver.** Inverting the codex rules to "absent" left a
   tree where deleting `skills` from a manifest, or `mcp/claude.mcp.json`
   entirely, would pass. Two assertions added, both demonstrated failing. This is
   the review point that changed the diff.
4. **(non-blocking, checked) Is a `_comment` array safe in a codex manifest?**
   Not assumed — measured. `codex plugin add` accepted the manifest and delivered
   all 12 skills; `agy plugin install` also succeeded (it reads
   `.claude-plugin/plugin.json`, unchanged). A JSON manifest has no comment
   syntax, so the array is the idiom already used by both `.mcp.json` and
   `mcp/claude.mcp.json` in this repo.
5. **(non-blocking, filed) `AGENTS.md`'s repo map goes stale.** Under the
   standing instruction not to commit an `AGENTS.md` change. Filed as
   **DOC-009**, linked. `git diff AGENTS.md` verified empty before the commit.
6. **(non-blocking, won't-do) `docs/manual/` untouched.** Confirmed by grep that
   no chapter mentions plugins at all; the manual's codex path is `connect.md`,
   which already says press Connect. Adding a plugin discussion would introduce
   the subject to a document that deliberately avoids it. Recorded in `files`
   §out of scope and in the report.
7. **(non-blocking, checked) Reversibility.** Two small edits restore the entry,
   and both rail messages name MCP-016 as the decision to re-open. R6 states the
   upstream condition that would make it worth doing, so "why not just put it
   back" has a written answer.

## Disposition

| Comment | Disposition |
|---|---|
| 1 `null` sentinel | won't-do — documented in place, message is explicit |
| 2 dead helper | n/a — not dead |
| 3 nothing asserts what still ships | **fixed in PR** (two assertions, each demonstrated failing) |
| 4 `_comment` in a codex manifest | verified against both binaries |
| 5 stale `AGENTS.md` | filed as DOC-009, linked |
| 6 manual untouched | won't-do, with the reason recorded in two documents |
| 7 reversibility | verified — path back is written into the rail and the FRD |

## Report against diff

`post-implementation-report.md` lists all five paths with rationales that match
what the diff does; the "not changed, deliberately" list is accurate
(`mcp/claude.mcp.json`, `docs/manual/`, `AGENTS.md` all confirmed untouched in
`--name-only`). Two things it declares beyond the plan — the `_comment` array
and the two extra rail assertions — are both flagged as such rather than
presented as planned. The four failure demonstrations are quoted with their real
messages, which match the code.

## Governing docs

The plan's **Governing docs** section holds:

- **FRD-012 R6 amended** — the ticket's explicit requirement, and the amendment
  is the substantive one, not a wording pass: matrix rows changed, the two old
  consequences replaced by three, and the reasoning the operator accepted is
  present in full (no `${…}` expansion; unrescuable because the two working
  directories are mutually exclusive; redundant because Connect already writes
  the working registration). The "what would bring it back" condition is written
  down, which the plan promised.
- **R2 and R7** amended as the plan said, and R7's added disclaimer about
  Connect's registrations is a genuine improvement rather than churn — with one
  MCP config left, "the plugin does not pin a board" was one careless read away
  from being applied to `.codex/config.toml`, which *must* pin one.
- **ADR-0009 followed, not amended** — holds. Every claim in the report is a
  tool call with a positive control, and the one place a listing appears
  (`codex mcp list`) it is labelled as the proxy and never as the claim.
- **No new ADR** — the argument (a requirement change, not a new architectural
  axis; same call MCP-011 made) is stated in both `plan.md` and the report, and
  the `check-doc-numbering` benefit is correctly named as a benefit rather than
  the reason. No ADR was added, so no numbering risk was taken.

## The code, and the ripple effects from `files`

Every ripple the `files` document listed was followed up and each was confirmed
a no-op by inspection rather than assumption: packaging (one directory entry),
Connect/providers (never read it; `providers.test.ts:87` asserts no provider
writes a file of that name), skills (both manifests keep `skills`, now
*asserted*), `release.mjs` (touches `version` only). The rail's own four
demonstrations are the test coverage for a script with no unit test.

## Verdict — **pass**, with the caveat in the first line.

Checked: the full diff; both manifests post-rebase; the four rail demonstrations
re-run to a clean pass; `npm test` (exit 0), `typecheck`, `plugin:check`,
`check:manual` (19 chapters), `verify:agents-block` (28/28) in a clean detached
clone; the codex before/after tool calls; the `agy` before/after tool calls from
a Connect-free folder; Connect's registration answering `get_status` with 161
tickets; `diff -r` of `~/.gemini/config` and `~/.gemini/skills` against their
pre-work snapshots, both empty.

Not independently checked, because there is no second reviewer: the judgement
that option 2 is the right product call. That was the operator's decision and
this ticket implemented it.

Merging under standing delegation.
