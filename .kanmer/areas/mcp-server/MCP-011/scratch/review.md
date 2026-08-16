# Review — PR #52 (MCP-011)

**I am both author and reviewer of this PR. This is a self-review and should not
be read as an independent one.** Where that matters most is the judgement call in
comment C1, which a second pair of eyes would be worth having on.

Reviewed at `a34673e`, rebased onto `6c3ae77`.

## Changes — what the diff actually does

| File | Change |
|---|---|
| `plugins/kanmer/mcp/claude.mcp.json` | `command` becomes `${KANMER_NODE:-node}`; adds `env.ELECTRON_RUN_AS_NODE`; adds a `_comment` array. Args and the absence of `--root` unchanged. |
| `plugins/kanmer/.mcp.json` | `${PLUGIN_ROOT}` dropped; `args` becomes the relative `mcp/kanmer-mcp.cjs`; adds `cwd: "."` and the same `env`; `_comment` array. |
| `plugins/kanmer/.claude-plugin/plugin.json`, `.codex-plugin/plugin.json` | `version` `0.1.0` → `0.3.2`. Nothing else. |
| `scripts/check-plugin-sync.mjs` | `+checkPluginManifests()` — version parity, `mcpServers` pointer resolution, per-file invocation shape, no `--root`. Appends to the existing success line. Does not touch the three existing checks. |
| `scripts/release.mjs` | `+pluginManifestPaths`, one `for` loop after the two existing `bump()` calls, and the dry-run line updated to say so. Reuses `bump()` unmodified. |
| `apps/gui/src/main/skillsVersion.test.ts` | New, 3 tests. Own `vi.mock("electron")` pointing `getAppPath` at the real `apps/gui`. |
| `docs/functional/frd/FRD-012-connect.md` | R2 codex bullet amended; new R6 (runtime matrix) and R7 (no `--root`); open-work line updated. |
| `README.md` | `KANMER_NODE` block; a paragraph saying codex gets skills only. |

## Comments

**C1 (blocking → resolved by disclosure, non-blocking as shipped).** The PR does
not deliver what the ticket's first verification bullet literally asks for on
codex: `plugin install` then `get_status` finds the board. It cannot — locating
the script and discovering the board need different working directories and codex
expresses only one. The right question for a reviewer is whether the PR
*pretends* otherwise. It does not: the limitation is in the commit message, the
PR body, the post-implementation report, FRD-012 R6, the README, and a filed
ticket ([[MCP-016]]). **Disposition: filed-as-ticket.** I record it as the weakest
point of the change and the one most deserving an independent opinion — an
alternative reading is that a registration which cannot work should be *removed*
rather than improved, and MCP-016 exists precisely to take that decision.

**C2 (non-blocking).** `_comment` arrays in both MCP configs are non-standard
JSON-with-comments-by-convention. Verified ignored by claude, codex and grok
(each registered and ran the server with them present); `agy` copies them
verbatim into its generated config, which is untidy but inert. Kept because these
are the two files most likely to be hand-edited by someone who has not read the
research, and the trap they document is expensive. **Disposition: won't-do —
deliberate, with the risk measured rather than assumed.**

**C3 (non-blocking).** `npm test` failed twice and passed three times across the
run, always in `apps/gui`, always at `kanmerGit.test.ts`'s `afterEach` `rmSync`
on a real git worktree — a Windows file lock, aggravated by this session's own
git activity and by other agents in the shared checkout. Final captured run:
`EXIT=0`, core 193 + gui 243. Pre-existing and unrelated to this diff, which
touches no git code. **Disposition: won't-do here** — recorded in the report
rather than swept up, and a candidate for its own ticket if it recurs.

**C4 (non-blocking).** The new rail only pins the *shape* of the two
invocations, not that they run. Nothing in CI can call a tool through four
vendor CLIs. The mechanism checks were done by hand and written down with their
output; the rail catches the regression class that actually happened (a token or
version quietly changing). **Disposition: won't-do — correct scope for a rail.**

**C5 (non-blocking).** `KANMER_NODE` is a new public env var introduced without
an ADR. It is a manifest detail inside FRD-012's existing matrix, and R6 names
it. **Disposition: won't-do**, flagged in the plan's Governing-docs section as a
cheap follow-up if a reviewer disagrees.

## Check: report against diff

Every file in the diff appears in the post-implementation report with a rationale,
and the rationales match what the code does. The report's before/after table is
honest about the one row that did not improve (codex still `TOOL_ABSENT`) rather
than quietly omitting it. No unplanned extras: the diff contains nothing outside
the plan's step list, and the one new artifact (`skillsVersion.test.ts`) was in
the `files` survey before implementation.

## Check: governing docs

The plan's **Governing docs** section claims FRD-012 R6 would state the runtime
dependency with its establishing command, R7 would pin the `--root` absence,
FRD-022 would be untouched, ADR-0009 followed not amended, and no new ADR. All
five hold against the diff. FRD-012 is `draft`, and the additions are the ones
the ticket's own Verification section asked for, so no authorization to modify a
settled decision was needed or taken. `git diff --stat` confirms FRD-022 and both
ADRs are untouched.

One rebase hazard handled correctly: main landed GUI-079 (grok to its own file,
ADR-0013) and renumbered a duplicate ADR-0012 while this branch was open. The
conflict resolution keeps main's shortened open-work list — GUI-079 is *not*
reintroduced — and ADR-0012 is still board discovery, so the R7 citation is right.

## Check: the code

- `checkPluginManifests()` — the per-file asymmetry is deliberate and each rule is
  commented with the host that requires it. All three new failure modes were
  demonstrated failing on a deliberately broken manifest, which is the part most
  worth insisting on: a rail nobody has seen fail is a rail nobody has tested.
- `release.mjs` — reuses `bump()`, whose regex replaces the first `"version"`;
  verified it hits both manifests. The dry-run summary was updated so it does not
  under-report what a real release writes.
- `skillsVersion.test.ts` — the separate file is the right call: `connect.test.ts`
  mocks `getAppPath` to `"/unused"` on purpose and other tests depend on that.
  Verified it fails on baseline with `expected '0.1.0' to be '0.3.2'`, which is
  what makes it a regression test rather than a tautology.
- Ripple effects from the `files` survey were followed: `bundledSkillsVersion`
  consumers, the codex cache path, README, and the committed bundle (checked, no
  rebuild needed).

## Rail

Run on the rebased head. `plugin:check` was run in a **clean detached clone**,
because MCP-007 (#48) landed while this branch was open and `plugin:check` now
refuses a linked worktree:

- `npm test` → `EXIT=0`, 193 + 243 (see C3)
- `npm run typecheck` → clean
- `npm run smoke:protocol` → 26/26
- `npm run plugin:check` → `29 tools match, bundle bytes match, 12 skill frontmatters parse, manifests at v0.3.2`

## Verdict

**Pass**, with C1 disclosed rather than resolved. What the ticket set out to do —
establish the runtime question by measurement instead of assumption, stop shipping
an unexpandable token, unfreeze the version so GUI-080's work becomes reachable,
and rail both against recurrence — is done and evidenced. What it could not do is
named in five places and owned by a filed ticket. Merging.
