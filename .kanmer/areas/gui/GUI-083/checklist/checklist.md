# Checklist — GUI-083

- [x] Add `.gitignore` rules for `.agents/skills/`, `.agents/mcp_config.json`, `.grok/skills/`, `.codex/config.toml`, `opencode.json`, extending the existing machine-local-agent-config comment block
- [x] Verify `.agents/plugins/marketplace.json` still tracked (`git ls-files`) and not matched by `git check-ignore`
- [x] Add regression test in `apps/gui/src/main/providers.test.ts`: every `copySkills` `skillsDir` in `PROVIDERS` has a matching `.gitignore` rule
- [x] Demonstrate the new test failing on a deliberately added fake `copySkills` destination, then passing again once the fake is removed — record the output
- [x] Record the `.codex/config.toml` / `opencode.json` commit-or-ignore decision and its reasoning in `docs/functional/frd/FRD-012-connect.md`
- [x] Confirm `git diff AGENTS.md` is empty before committing
- [x] Run rail: `npm test`, `npm run typecheck` (this box produces proof.md evidence)

## Progress notes

(append with `set_ticket_doc(doc: "checklist", append: true)`)

- `npm run typecheck` — clean across all 4 workspaces (core, mcp-server, ui, gui).
- `npm test` — @kanmer/core: 193/193 passed. @kanmer/gui: 235/236 passed, 1 failed:
  `kanmerGit.test.ts > renameBoardBranch > keeps the history, the path and the
  remote consistent` — timed out at the default 5000ms. This is the known
  pre-existing flake (GUI-086, real git subprocesses + Windows temp cleanup
  under concurrent load), not a regression from this change. Reran that file
  alone: `npx vitest run src/main/kanmerGit.test.ts --testTimeout=30000` →
  7/7 passed clean. `npm run test:scripts` — 41/41 passed.
- Demonstration of the new gitignore-coverage check (before committing):
  temporarily added a fake `copySkills` provider entry
  (`skillsDir: ".totally-unignored-fake/skills"`) to `PROVIDERS` in
  `providers.ts`, ran `npx vitest run src/main/providers.test.ts -t "gitignore"`
  → 1 failed as expected (`expected false to be true`, on the fake dir).
  Reverted the fake entry (`git diff --stat providers.ts` empty afterwards),
  reran the same command → 4/4 passed. The check is proven to fail on a real
  gap, not just pass trivially.
- Discovery: GUI-079 had already merged into origin/main by the time the
  worktree was created — grok's `configPath` moved from `.mcp.json` to
  `.grok/config.toml` (ADR-0012). Added `.grok/config.toml` to the ignore
  rules (not in the original research, which was written against a
  pre-fetch checkout); `.mcp.json` stays ignored, now correctly attributed to
  Claude Code's own `claude mcp add -s project` write rather than grok's.
- `git diff AGENTS.md` — empty, confirmed before committing.
- Full worktree diff after all changes: `.gitignore`,
  `apps/gui/src/main/providers.test.ts`, `docs/functional/frd/FRD-012-connect.md`
  only — no `providers.ts` edit (GUI-079 territory, read-only per the mission).

## Closeout

- [x] Confirmed PR #50 merged (`state: MERGED`)
- [x] proof.md final, records merge commit and PR
- [x] commits/prs recorded on the ticket
- [x] Outcome recorded in the ticket body
- [ ] worktree removed, branch deleted, ticket released
