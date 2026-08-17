# Checklist — GUI-073

*Distilled from plan.md. Scope is **what is said**, never the binding — [[MCP-015]] owns that.*

- [x] `providers.ts:71` — `AgentProvider.dispatch` doc comment says what the flag gates, with no "antigravity is register-only"
- [x] `providers.ts` antigravity entry — `.agents/skills` comment keeps its true half and gains the workspace-binding condition
- [x] `providers.ts` antigravity entry — the refuted "`agy -p` known-broken piped (GH #318/#76)" comment replaced by the measured reason `dispatch` stays `false` (no binding → dispatched agent cannot see the board), naming [[MCP-015]] and noting the GH issues were never fetched
- [x] `providers.ts` — `antigravityBindingNote()` added beside `codexTrustNote`, pure and exported
- [x] `connect.ts` — the note appended to Antigravity's connect output, mirroring the `id === "codex"` block
- [x] `Settings.tsx` panel blurb — no longer says opencode/Antigravity "only read skills globally"
- [x] `Settings.tsx` badge — `· register-only` → `· no background dispatch`, still derived from `!p.dispatch` so it cannot disagree with the dispatch menu
- [x] `providers.test.ts` — the "antigravity is register-only" test rewritten to assert the evidenced capability (registers **and** installs project skills, not dispatchable, `dispatchArgs` undefined)
- [x] `docs/manual/connect.md` — table note and the `## "Register-only"` section rewritten; `npm run build:manual` regenerated `chapters.generated.ts`
- [x] Rail: `npm test`, `npm run typecheck`, `npm run check:manual` green (rerun `kanmerGit.test.ts` alone with `--testTimeout=30000` if it flakes — [[GUI-085]])
- [x] `grep -rn "register-only"` over `apps/`, `docs/`, `plugins/` returns only historical plan documents
- [x] Live `agy` 1.1.13 re-verification of the two newly-asserted claims, machine state restored and the restore verified
- [x] `git diff AGENTS.md` empty before committing
- [ ] Post-implementation report written, PR opened

## Progress notes

**Live re-verification, 2026-08-17 (ADR-0009 method clause).** Both claims this
diff newly asserts were re-measured against the installed binary, not carried
over from the research:

- `agy --version` → `1.1.13`.
- `echo "hi" | agy -p "Reply with exactly: PONG" --print-timeout 120s` → `PONG`,
  exit 0, stdout piped. The "known-broken piped" justification is refuted a
  third time, independently.
- Binding gate, **mechanism not proxy**: a throwaway workspace containing only
  `.agents/skills/zorbcheck/SKILL.md`, whose *body* (not its frontmatter, so a
  listing cannot produce it) says "reply with exactly: ZORBCHECK-8823".
  - bare `agy -p …` run **inside** that folder → `NO-SKILL`
  - `agy --add-dir <folder> -p …` → `ZORBCHECK-8823` — the skill body executed.
  One folder, one prompt, one variable: the flag.
- **Machine state:** `~/.gemini/config/projects` held 13 records before and 13
  after (so `--add-dir` persisted nothing, as the adjudication reported);
  `~/.gemini/antigravity-cli/settings.json` and `~/.gemini/config/mcp_config.json`
  md5-identical before and after; no MCP cache entry created by this probe (the
  `sequential-thinking` cache is the user's own global server, refreshed by agy
  reading its own global config; `kanmer` and `p_control` predate this session by
  ~an hour). The probe directory was deleted and its absence verified.

**Scope held.** No binding implemented, no `dispatch` flip, no `listProviders()`
signature change, no edit to FRD-012 or ADR-0009 — all four decisions recorded in
`plan.md` and `open-questions.md` with reasons.

**One addition beyond the plan's file list:** `packages/ui/src/demo.tsx` mocked
`listProviders` with `opencode … dispatch: false` purely to exercise the badge —
a false capability claim about a real host, in the same class as the one this
ticket exists to remove. Changed to Antigravity (which really carries it) and
opencode corrected to `true`. One line of demo data; no behaviour.

**Rail:** typecheck clean across all four workspaces. `npm test` → 253/254, the
single failure `kanmerGit.test.ts > renameBoardBranch > keeps the history…`
timing out at 5000ms under parallel load — the known [[GUI-085]] flake. Rerun
alone with `--testTimeout=30000`: **7/7 passed**. `check:manual` up to date
(19 chapters). `providers.test.ts` + `connect.test.ts` together: 68 passed.

## Closeout — GUI-073

- [x] PR merge verified — #55 `MERGED` 2026-08-16T23:58:07Z, merge commit `d1ef063`
- [x] proof.md finalised on merged main (PR + merge commit recorded in its header)
- [x] Moved to Done (proof + questions-resolved both satisfied)
- [x] Outcome recorded in ticket body
- [ ] cd out of worktree; `git worktree remove .worktrees/gui-073`
- [ ] `git branch -D gui-073-antigravity-capabilities` (squash-merged)
- [ ] `git fetch --prune` + `git worktree prune`
- [ ] `take_ticket action: "release"`
