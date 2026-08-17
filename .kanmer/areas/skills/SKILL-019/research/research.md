# Research — SKILL-019: duplicate Codex skill discovery

## Question

Why does Codex expose both repository-local Kanmer skills and plugin-qualified Kanmer skills, what configuration controls exist, and which installation model removes the duplication without breaking the other supported hosts?

## Findings

- Official OpenAI documentation says Codex scans `.agents/skills` in every directory from the current working directory up to the repository root. It explicitly says skills sharing the same `name` are not merged and both can appear in selectors. Source: https://learn.chatgpt.com/docs/build-skills, “Where Codex loads local skills”.
- The same OpenAI page distinguishes local/repository discovery from reusable distribution and recommends plugins for distributing reusable skill sets. Plugin-installed skills become available in a new Codex session. Sources: https://learn.chatgpt.com/docs/build-skills and https://learn.chatgpt.com/docs/plugins.
- Codex can disable an individual local skill by absolute path using `[[skills.config]]`, `path = ".../SKILL.md"`, `enabled = false` in `~/.codex/config.toml`; restart is required. The documented control is a user-level, path-specific override, so it cannot safely encode a portable per-repository Kanmer invariant. Sources: https://learn.chatgpt.com/docs/build-skills and https://learn.chatgpt.com/docs/config-file/config-reference.
- This live session demonstrates the collision: unqualified `kanmer-plan` resolved to `C:\Users\PC\Documents\GitHub\kanmer\.agents\skills\kanmer-plan\SKILL.md`, while `kanmer:kanmer-plan` resolved to `C:\Users\PC\.codex\plugins\cache\kanmer-plugins\kanmer\0.3.3\skills\kanmer-plan\SKILL.md`. The copies already differ: the plugin copy contains the open-question step and handoff text absent from the repo-local copy.
- `apps/gui/src/main/providers.ts` installs Codex through the marketplace plugin, while both opencode and Antigravity copy the same roster into `.agents/skills`. Codex therefore sees the other providers’ copied tree by design whenever either is connected.
- `apps/gui/src/main/providers.test.ts` pins the shared `.agents/skills` destination for opencode and Antigravity, but its nearby “no caller ever sees both” premise only concerns marketplace manifest schemas; it does not test skill discovery overlap.
- FRD-012 R2 already records provider-private alternatives: opencode reads `.opencode/skills`; Antigravity retains `.agent/skills` as a compatibility location; Grok already has `.grok/skills`. The current shared `.agents/skills` choice optimized one write for several hosts but predates the now-confirmed Codex collision.
- `packages/core/src/staleness.ts` treats `.agents/skills` and `.grok/skills` as expected copied destinations. Changing provider destinations must update this detector so reconciliation reports the new canonical paths and can recognize/retire the old owned tree.
- The current repo status independently reports `.agents/skills` as behind the bundled skills by content hash. That drift is not the root cause, but it proves the duplicate surfaces can diverge and produce different behavior.

## Implications

The root cause is not ambiguous precedence: official documentation says both skills may appear. Kanmer should preserve the plugin as Codex’s single reusable distribution surface and stop writing Kanmer skills to any repository path Codex scans. The portable fix is to use provider-private copy destinations for hosts that cannot use the plugin, reconcile owned skills away from the legacy `.agents/skills` tree, and update tests/docs/staleness together. A generated user-level `skills.config` deny-list is rejected because it is absolute-path, machine-global configuration and would couple Connect to user-owned Codex settings.

## Open questions

No blocking product question remains for planning. The implementation must verify the installed opencode and Antigravity binaries still load their documented compatibility directories before changing destinations, following ADR-0009’s capability-evidence rule.
