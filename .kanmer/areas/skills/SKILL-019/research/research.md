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

---

# Provider documentation follow-up — 2026-08-17

## Question

Do Antigravity and OpenCode have provider-private project skill locations that let Kanmer avoid Codex’s .agents/skills scan, and can Codex suppress only Kanmer’s unavoidable Antigravity copies through project configuration?

## Findings

- Google Antigravity’s current skills documentation defines the workspace location as <workspace-root>/.agents/skills/<skill-folder>/ and the global location as ~/.gemini/config/skills/<skill-folder>/. It says .agents/skills is now the default and singular .agent/skills is retained only for backward support. Source: https://antigravity.google/docs/skills/.
- Antigravity’s MCP documentation independently defines workspace MCP configuration at .agents/mcp_config.json for IDE, CLI, and SDK discovery. Keeping the skill and MCP assets together under the documented .agents workspace root matches the provider’s current contract. Source: https://antigravity.google/docs/mcp/.
- The Antigravity CLI-specific plugin/skills page also instructs workspace skills under .agents/skills. Its example describes individual .md files, while the product-level skills page describes Agent Skills folders containing SKILL.md; Kanmer should follow the newer product-level Agent Skills contract already proven against the installed binary, not reinterpret that format discrepancy as a private-directory option. Source: https://antigravity.google/docs/cli/plugins/.
- Antigravity CLI project documentation says a bare agy uses default-cli-project; a specific project requires --project=<id> or --new-project. This corroborates ADR-0009’s workspace-binding caveat rather than changing the skills path. Source: https://antigravity.google/docs/cli/projects/.
- Therefore moving Antigravity to .agent/skills would deliberately choose a legacy compatibility path solely to work around another host. That is a fragile fix and is rejected.
- OpenCode documents six discovery locations. Its first-party project location is .opencode/skills/<name>/SKILL.md; it also supports Claude-compatible and agent-compatible locations. For project paths it walks from CWD to the git worktree. Source: https://opencode.ai/docs/skills/.
- OpenCode’s troubleshooting explicitly says skill names should be unique across all locations. Using .opencode/skills for Kanmer avoids contributing another copy to the cross-agent .agents namespace and is fully documented, not a compatibility fallback. Source: https://opencode.ai/docs/skills/.
- OpenCode’s MCP documentation keeps local MCP definitions inside the project opencode.json[c] mcp object and resolves relative server cwd values from the workspace. Kanmer’s existing OpenCode MCP registration in opencode.json is aligned and does not need redesign for this ticket. Source: https://opencode.ai/docs/mcp-servers.
- OpenAI’s Codex config basics state that Codex loads trusted project .codex/config.toml layers and that project config has higher precedence than user config. The config reference defines skills.config as per-skill path enablement. Together, these establish that Kanmer can put path-specific disables in the same trusted, project-local, already-machine-specific config file Connect owns, rather than mutating ~/.codex/config.toml. Sources: https://learn.chatgpt.com/docs/config-file/config-basic and https://learn.chatgpt.com/docs/config-file/config-reference.
- OpenAI documents the disable entry as a path to a skill folder containing SKILL.md, while the Build Skills example shows a SKILL.md path. That documentation inconsistency means the exact accepted path shape and relative-path base must be established against the installed Codex binary before implementation. An absolute path is acceptable in principle because Kanmer’s project .codex/config.toml is already gitignored and contains machine-specific absolute MCP paths.
- The corrected host matrix is: Codex plugin skills plus project config disables for Kanmer-owned .agents/skills paths; Antigravity remains at .agents/skills; OpenCode moves to .opencode/skills; Grok remains at .grok/skills; Claude remains plugin-installed.

## Implications

The collision cannot be removed by relocating Antigravity without abandoning its primary documented workspace contract. The revised solution is selective suppression inside Codex, not removal of the shared standard directory: keep Antigravity canonical at .agents/skills, move OpenCode to its native private directory, and have Codex’s project config disable the exact Kanmer-owned local paths while leaving plugin-qualified Kanmer skills enabled. Connect must merge and unmerge only its own skills.config entries, preserve unrelated project config, and remain correct whichever provider connects first. Installed-binary tests must settle the path representation before coding.

## Open questions

No user product choice is required for planning. The exact Codex skills.config.path representation is an implementation validation gate because the official examples disagree about file-versus-folder and do not state relative-path resolution.

---

# User decision follow-up — 2026-08-17

The user rejected a design that writes per-skill Codex disable entries into every Kanmer project. That operational cost is disproportionate and makes each project carry configuration whose only purpose is undoing Kanmer’s own duplicate installation.

## Revised implication

Use .agents/skills as the project-local canonical roster for Codex and Antigravity. Codex Connect must copy/reconcile that roster instead of installing the Codex marketplace plugin. OpenCode moves to .opencode/skills and Grok stays at .grok/skills. Plugin installation remains a separate, user-chosen distribution route, not something Connect combines with project-local installation.

Existing Codex plugin users need a one-time migration path, not per-project suppression. Implementation research must establish the supported Codex CLI/browser disable or uninstall mechanism and present it explicitly; Kanmer must not silently remove a global plugin that may serve other projects. New Connects must never create both surfaces.

---

# Antigravity plugin correction — 2026-08-17

The user challenged the assumption that Antigravity must consume project-copied skills. The challenge is correct.

Google’s Antigravity CLI documentation defines plugins as namespaced bundles staged globally under ~/.gemini/antigravity-cli/plugins/<plugin_name>/, with an optional skills/ directory, and documents agy plugin install /path/to/local/plugin. Kanmer’s own FRD-012 records a measured successful Kanmer plugin install in AGY that processed all 12 skills; MCP delivery was the broken component, and MCP-016 intentionally removed it from the plugin. Therefore the plugin is already a proven skills-only route for AGY.

The previous objection conflated two different scopes. Kanmer’s MCP registration must remain project-scoped because it selects one board and source root. Kanmer’s workflow skills are reusable product instructions, already installed globally through plugins for Codex and Claude. Global AGY plugin skills are consistent with that model. AGY can use plugin skills globally while .agents/mcp_config.json continues to hold only the project-specific Kanmer MCP server.

## Revised implication

Keep Codex on its plugin. Move Antigravity skill installation from project .agents/skills to agy plugin install of the Kanmer plugin, while retaining project .agents/mcp_config.json for MCP. Move OpenCode to .opencode/skills. This removes Kanmer’s project .agents/skills tree entirely for the supported Connect matrix, so Codex has no local duplicate to discover and no per-project suppression is needed. Existing stamped .agents/skills installs require safe reconciliation after the AGY plugin is proven active.

---

# Final scope decision — OpenCode only

The user explicitly deferred Antigravity because no acceptable workaround is currently established. This ticket now changes only OpenCode’s copied-skill destination from .agents/skills to its first-party .opencode/skills path.

## Findings

- OpenCode officially searches .opencode/skills/<name>/SKILL.md and walks upward from CWD to the git worktree. This is a primary supported project location, not a fallback.
- apps/gui/src/main/providers.ts currently assigns both OpenCode and Antigravity to .agents/skills. Changing only OpenCode’s registry entry naturally makes the existing peer-by-equal-destination cleanup stop treating them as shared peers.
- connect.ts peer retention is data-driven by skillsDir equality; no new cleanup algorithm is required. Tests that explicitly assert the old shared directory must change.
- packages/core/src/staleness.ts mirrors provider copy destinations. It must add .opencode/skills while retaining .agents/skills for Antigravity and .grok/skills for Grok.
- Existing OpenCode installations may leave Kanmer-owned stamped skills under .agents/skills. Because Antigravity may still use the same tree, this narrow change must not automatically delete or migrate that legacy shared content. Reconnect installs the current roster into .opencode/skills; legacy cleanup is deferred with the broader Antigravity duplicate problem.
- FRD-012 and ADR-0009 currently make the shared-tree choice explicit. This implementation corrects only the OpenCode bullet and shared-directory ownership language. FRD-023 delegates the matrix to FRD-012 and requires no semantic change beyond any evidence note needed for consistency.

## Implication

Implement a registry/docs/tests/staleness/gitignore change only. Codex and Antigravity behavior is intentionally unchanged; the duplicate remains possible through Antigravity and is recorded as deferred rather than falsely claimed fixed.
