# Checklist — GUI-073

*Distilled from plan.md. Scope is **what is said**, never the binding — [[MCP-015]] owns that.*

- [ ] `providers.ts:71` — `AgentProvider.dispatch` doc comment says what the flag gates, with no "antigravity is register-only"
- [ ] `providers.ts` antigravity entry — `.agents/skills` comment keeps its true half and gains the workspace-binding condition
- [ ] `providers.ts` antigravity entry — the refuted "`agy -p` known-broken piped (GH #318/#76)" comment replaced by the measured reason `dispatch` stays `false` (no binding → dispatched agent cannot see the board), naming [[MCP-015]] and noting the GH issues were never fetched
- [ ] `providers.ts` — `antigravityBindingNote()` added beside `codexTrustNote`, pure and exported
- [ ] `connect.ts` — the note appended to Antigravity's connect output, mirroring the `id === "codex"` block
- [ ] `Settings.tsx` panel blurb — no longer says opencode/Antigravity "only read skills globally"
- [ ] `Settings.tsx` badge — `· register-only` → `· no background dispatch`, still derived from `!p.dispatch` so it cannot disagree with the dispatch menu
- [ ] `providers.test.ts` — the "antigravity is register-only" test rewritten to assert the evidenced capability (registers **and** installs project skills, not dispatchable, `dispatchArgs` undefined)
- [ ] `docs/manual/connect.md` — table note and the `## "Register-only"` section rewritten; `npm run build:manual` regenerated `chapters.generated.ts`
- [ ] Rail: `npm test`, `npm run typecheck`, `npm run check:manual` green (rerun `kanmerGit.test.ts` alone with `--testTimeout=30000` if it flakes — [[GUI-085]])
- [ ] `grep -rn "register-only"` over `apps/`, `docs/`, `plugins/` returns only historical plan documents
- [ ] Live `agy` 1.1.13 re-verification of the two newly-asserted claims, machine state restored and the restore verified
- [ ] `git diff AGENTS.md` empty before committing
- [ ] Post-implementation report written, PR opened

## Progress notes
