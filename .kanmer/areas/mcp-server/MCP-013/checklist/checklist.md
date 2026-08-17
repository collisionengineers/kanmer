# MCP-013 — Checklist

## Code

- [x] `connect.ts`: add `marketplaceRoot()` = `resolve(pluginRoot(), "..", "..")`, with the invariant `<marketplaceRoot>/plugins/kanmer === pluginRoot()` stated in the comment
- [x] `connect.ts`: `installSkills` marketplace branch returns per-command outcomes (command, ok, output) instead of collapsing a failure into `plugin cmd skipped`
- [x] `connect.ts`: `connectAgent` returns `ok: false` with the **failing command** and an output that still says the registration succeeded
- [x] `connect.ts`: `updateSkills` surfaces the same failure (verify it inherits it rather than re-swallowing)
- [x] `providers.ts`: `InstallSpec.marketplaceCommands` parameter renamed `localDir` → `marketplaceRoot`
- [x] `providers.ts`: codex gains `codex plugin add kanmer@kanmer-plugins` as its second command
- [x] `electron-builder.yml`: `extraResources` packs `.claude-plugin/marketplace.json` and `.agents/plugins/marketplace.json`; the misleading comment corrected

## Tests and rails

- [x] `connect.test.ts`: a marketplace command that really exits non-zero (real subprocess, not a stub) yields `ok: false` carrying that command
- [x] `connect.test.ts`: the same path with a succeeding command stays `ok: true`
- [x] Both new assertions demonstrated **failing on the baseline** — the swallow restored → 3 failed with `expected true to be false`; `pluginRoot()` restored as the argument → the invariant test failed
- [x] `providers.test.ts`: each provider's `<plugin>@<marketplace>` string matches the name in the marketplace manifest that defines it — read off disk, both schemas
- [x] `check-plugin-sync.mjs`: both manifests exist and each `plugins[].source` resolves to `plugins/kanmer`
- [x] `check-plugin-sync.mjs`: `electron-builder.yml`'s `extraResources` packs both manifests and the plugin directory
- [x] `check-updater-package.mjs`: the packed `win-unpacked/resources/` carries both marketplace JSONs
- [x] Each new rail assertion demonstrated failing on a deliberately broken input (manifest deleted, `source` repointed, `extraResources` entry removed, both names collapsed to one, manifests absent from a synthetic packed tree)

## Docs

- [x] FRD-012 R2: Claude bullet rewritten — no longer "the install fails and the failure is swallowed"
- [x] FRD-012 R2: codex bullet rewritten — two commands, `kanmer-plugins`, skills-only, MCP-016 still owns the server question
- [x] FRD-012 R2: third bullet added for the packaged-app marketplace source
- [x] FRD-012 closing open-work list: MCP-013 removed, MCP-014/015/016 retained
- [x] FRD-012 R6/R7 confirmed **unedited** (MCP-011's)

## Verification

- [x] `npm test` — one pre-existing `kanmerGit.test.ts` flake (GUI-085/089), shown to be a flake (different tests failed on rerun, then passed clean) and not chased; one unrelated `jsdom` miss from GUI-065 (`6dbb284`, merged after this ticket), fixed by `npm install`
- [x] `npm run typecheck` green
- [x] `npm run plugin:check` green — run from the **main checkout** on merged main (MCP-007 refuses in a worktree)
- [x] `npm run verify:agents-block` green (28/28) — plus `npm run verify:skills`, a rail that arrived with SKILL-013 after the brief was written
- [x] `git diff AGENTS.md` empty before every commit
- [x] Clean-profile install on merged main: `claude plugin marketplace add` + `install`, exit 0 both
- [x] **Mechanism**: `claude -p` calls `mcp__plugin_kanmer_kanmer__get_status` → `build: plugin`, board found, 160 tickets
- [x] codex: `plugin marketplace add` + `plugin add`, then `codex exec` reports the 12 `kanmer-*` skills
- [x] Packaged layout: `resources/` assembled exactly as merged main's `extraResources` specifies, installed from, and a tool answered from inside it
- [x] Negative control retained on both hosts and on merged main: the **old** argument still exits 1
- [x] Machine state restored and the restore verified (real `claude`/`codex` profiles show no `kanmer` marketplace; throwaway codex home deleted)
- [x] PR opened (#60), reviewed, merged as `f5c370e`; post-implementation report and proof written

---

## Progress

**Worktree created off `origin/main` = `8d9d8f9`** — not `3e9ee2c` (the research
baseline). SKILL-013 (#56) and an MCP-015 slice landed in between. Checked the
diff over `apps/gui/src/main/{connect,providers}.ts`,
`apps/gui/electron-builder.yml` and `scripts/check-plugin-sync.mjs`: the regions
this ticket touches are byte-identical to what the research measured, so every
finding still holds. New sibling rail `npm run verify:skills`
(`scripts/verify-skill-prose.mjs`) arrived with SKILL-013 — added to the rail run
even though the brief predates it.

Code steps 1-5 done: `marketplaceRoot()`, the structured
`SkillsInstallOutcome`, `connectAgent`/`updateSkills` surfacing the failure,
`providers.ts` rename + codex's second command, and the packaging entries.

One extension beyond the plan, deliberate: **the copySkills path was swallowing
too.** `connectAgent`'s `.catch()` turned any throw from `installSkills` into the
note `skills failed: …` on an `ok: true` result — the same defect as the
marketplace branch, one branch over. Both now report through the same
`failure` channel. Called out in the report rather than absorbed.

**Two things the ticket did not anticipate, both found by running the commands:**

1. **codex's install command was missing entirely.** `codex plugin marketplace
   add` alone leaves the plugin `not installed`; there is no `codex plugin
   install`, the verb is `add`. So a codex Connect delivered **no skills**, even
   with the root corrected. Same defect class, fixed here; MCP-016 untouched
   because that ticket is about the MCP server, not the skills.
2. **`marketplaceRoot()` and `pluginRoot()` had to be exported.** A mismatch
   between two directories is not observable from either alone, and under this
   test file's `vi.mock("electron")` a literal-path assertion would have tested
   the stub rather than the derivation.

**Review (author = reviewer, stated as such) raised one blocking point, fixed in
the PR:** `providers.test.ts`'s check-on-the-check asserted that a shorter string
does not contain a longer one — true regardless, and it would have passed with
the assertion it guards deleted. Rewritten to run the same predicate the real
assertions use (`09c0b91`).
