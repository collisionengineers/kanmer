# MCP-013 — Checklist

## Code

- [ ] `connect.ts`: add `marketplaceRoot()` = `resolve(pluginRoot(), "..", "..")`, with the invariant `<marketplaceRoot>/plugins/kanmer === pluginRoot()` stated in the comment
- [ ] `connect.ts`: `installSkills` marketplace branch returns per-command outcomes (command, ok, output) instead of collapsing a failure into `plugin cmd skipped`
- [ ] `connect.ts`: `connectAgent` returns `ok: false` with the **failing command** and an output that still says the registration succeeded
- [ ] `connect.ts`: `updateSkills` surfaces the same failure (verify it inherits it rather than re-swallowing)
- [ ] `providers.ts`: `InstallSpec.marketplaceCommands` parameter renamed `localDir` → `marketplaceRoot`
- [ ] `providers.ts`: codex gains `codex plugin add kanmer@kanmer-plugins` as its second command
- [ ] `electron-builder.yml`: `extraResources` packs `.claude-plugin/marketplace.json` and `.agents/plugins/marketplace.json`; the misleading comment corrected

## Tests and rails

- [ ] `connect.test.ts`: a marketplace command that really exits non-zero (real subprocess, not a stub) yields `ok: false` carrying that command
- [ ] `connect.test.ts`: the same path with a succeeding command stays `ok: true`
- [ ] Both new assertions demonstrated **failing on the baseline** (`git stash` the `connect.ts` change), so they are shown to catch the defect rather than asserted to
- [ ] `providers.test.ts`: each provider's `<plugin>@<marketplace>` string matches the name in the marketplace manifest that defines it — read off disk, both schemas
- [ ] `check-plugin-sync.mjs`: both manifests exist and each `plugins[].source` resolves to `plugins/kanmer`
- [ ] `check-plugin-sync.mjs`: `electron-builder.yml`'s `extraResources` packs both manifests and the plugin directory
- [ ] `check-updater-package.mjs`: the packed `win-unpacked/resources/` carries both marketplace JSONs
- [ ] Each new rail assertion demonstrated failing on a deliberately broken input

## Docs

- [ ] FRD-012 R2: Claude bullet rewritten — no longer "the install fails and the failure is swallowed"
- [ ] FRD-012 R2: codex bullet rewritten — two commands, `kanmer-plugins`, skills-only, MCP-016 still owns the server question
- [ ] FRD-012 closing open-work list: MCP-013 removed, MCP-014/015/016 retained
- [ ] FRD-012 R6/R7 confirmed **unedited** (MCP-011's)

## Verification

- [ ] `npm test` green (note, do not chase, a `kanmerGit.test.ts` flake — GUI-085/089)
- [ ] `npm run typecheck` green
- [ ] `npm run plugin:check` green — run from the **main checkout**, not the worktree (MCP-007)
- [ ] `npm run verify:agents-block` green
- [ ] `git diff AGENTS.md` empty before every commit
- [ ] Clean-profile install on the branch: `claude plugin marketplace add` + `install`, exit 0 both
- [ ] **Mechanism**: `claude -p` calls `mcp__plugin_kanmer_kanmer__get_status` → real board counts, `build: "plugin"`
- [ ] codex: `plugin marketplace add` + `plugin add`, then `codex exec` reports the 12 `kanmer-*` skills
- [ ] Negative control retained: the **old** argument still exits 1, so the fix is shown to be what changed
- [ ] Machine state restored and the restore verified (real `claude`/`codex` profiles show no `kanmer` marketplace)
- [ ] PR opened; post-implementation report written

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
