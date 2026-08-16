# Checklist — GUI-083

- [ ] Add `.gitignore` rules for `.agents/skills/`, `.agents/mcp_config.json`, `.grok/skills/`, `.codex/config.toml`, `opencode.json`, extending the existing machine-local-agent-config comment block
- [ ] Verify `.agents/plugins/marketplace.json` still tracked (`git ls-files`) and not matched by `git check-ignore`
- [ ] Add regression test in `apps/gui/src/main/providers.test.ts`: every `copySkills` `skillsDir` in `PROVIDERS` has a matching `.gitignore` rule
- [ ] Demonstrate the new test failing on a deliberately added fake `copySkills` destination, then passing again once the fake is removed — record the output
- [ ] Record the `.codex/config.toml` / `opencode.json` commit-or-ignore decision and its reasoning in `docs/functional/frd/FRD-012-connect.md`
- [ ] Confirm `git diff AGENTS.md` is empty before committing
- [ ] Run rail: `npm test`, `npm run typecheck` (this box produces proof.md evidence)

## Progress notes

(append with `set_ticket_doc(doc: "checklist", append: true)`)
