## Research findings (profile=fix, `research` not a gated doc — recorded here per instructions)

**Confirmed defect, real parser evidence (BEFORE fix):**
- Ran `agy --new-project --log-file <log> -p "List every skill ... kanmer-*"` from the main
  checkout (C:\Users\PC\Documents\GitHub\kanmer), which already has a pre-existing, untracked
  `.agents/skills/` tree (Antigravity's project-scoped skill dir per `apps/gui/src/main/providers.ts`
  — `install: { kind: "copySkills", skillsScope: "project", skillsDir: ".agents/skills" }`) with the
  current (broken) `plugins/kanmer/skills/*/SKILL.md` frontmatter already copied in (frontmatter
  bytes identical to source; only body differs slightly/staler, irrelevant to parsing).
- Result: 11 of 12 skills listed. `kanmer-report` is missing.
- The log file captured the real parser error 4x (one per subagent/session fork agy spins up):
  `Failed to parse skill file C:\Users\PC\Documents\GitHub\kanmer\.agents\skills\kanmer-report\SKILL.md: failed to parse frontmatter: yaml: line 2: mapping values are not allowed in this context`
- This exactly matches independent repro with the `yaml` npm package (already a dependency of
  packages/core and apps/gui, hoisted to root node_modules) and `js-yaml` (CORE_SCHEMA): both reject
  `plugins/kanmer/skills/kanmer-report/SKILL.md`'s frontmatter with a parse error rooted at the same
  `"now": ` / `"since <period>": ` colon-space-inside-plain-scalar construct on line 3 (line 2 of the
  frontmatter block alone, since agy counts from the first line after `---`).
- Root cause: YAML plain (unquoted) scalars cannot contain the literal sequence `: ` (colon+space)
  anywhere — it's ambiguous with a mapping key per spec. `description:` here is an unquoted plain
  scalar and contains `"now": ` and `"since <period>": ` — two occurrences.

**Sweep of the other 11 skills — same hazard checked two ways:**
1. Parsed every `SKILL.md`'s frontmatter block with both `yaml` (npm, strict) and `js-yaml`
   (CORE_SCHEMA): only `kanmer-report` fails. All other 11 parse cleanly under both.
2. Grepped every description value for a second `: ` occurrence beyond the leading `description: `
   key delimiter (i.e. any embedded colon-space, quoted or not): only `kanmer-report` has any
   (2 occurrences, both now the ones being fixed). The other 11 have zero.
   Conclusion: no other skill needs a content fix. The sweep's job is done by demonstrating (and
   recording) a clean bill of health with the same tooling that catches the real defect, not by
   guessing.

**Fix approach:** restructure rather than quote (ticket's stated preference). Replace the two
`"X": ` colon constructs with an em dash: `(now — in flight/blocked/up next)` / `(since <period> —
what shipped, throughput)`. Verified via `yaml`/`js-yaml` that the restructured line parses cleanly
and the routing-relevant terms ("now", "since <period>", the trigger phrases) are all still present
verbatim — nothing lost for host matching.

**Rail check plan:** `scripts/check-plugin-sync.mjs` (already the plugin-bundle rail, run by
`npm run plugin:check`) gets a third check: parse every `plugins/kanmer/skills/*/SKILL.md`
frontmatter block with the `yaml` package (same one used above) and fail listing any file whose
frontmatter doesn't parse. Must be demonstrated failing against a deliberately broken fixture
(temporary fixture skill dir under a scratch/tmp location, or a saved copy of the original broken
kanmer-report text fed through the same parse function in a throwaway test) — not just asserted to
work by inspection.

**Constraints reconfirmed by reading `apps/gui/src/main/providers.ts`:**
- `.claude/skills/` and `.agents/skills/` are both project-scoped *install* copies, not source.
  Antigravity reads `.agents/skills/<name>/SKILL.md`. Source of truth stays
  `plugins/kanmer/skills/`.
- `.agents/skills/` here is pre-existing untracked machine state (not created by this session,
  likely left over from GUI-073's "planted skill tree" research) and is NOT in `.gitignore` (only
  `.mcp.json` and `.claude/skills/` are). Treating it as borrowed state: hashed the original
  `kanmer-report/SKILL.md` (md5 4e780d1ec1ce2a3900df08f40e78ce5c) before touching it, will restore
  after the after-fix real-CLI check and verify the hash matches again.
- Other agents are concurrently active in this same main checkout (system reminder lists `main`,
  `examine-kanmer-auto`, `review-all-completed`), and it already has unrelated modified/untracked
  files (`AGENTS.md` modified, `.codex/`, `icon.png`, `logo.png`). Do not touch any of that — all
  actual code edits for this ticket happen in the dedicated worktree `.worktrees/skill-018` per the
  ticket's Execute instructions, not in the main checkout.
