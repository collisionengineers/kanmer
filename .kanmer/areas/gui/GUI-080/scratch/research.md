## Raw evidence (2026-08-16, read-only)

- `plugins/kanmer/skills/` → 12 dirs: kanmer-{auto,closeout,docs,execute,groom,plan,report,research,review,setup,tickets,verify}.
- `.claude/skills/` → the same 12 + `run-kanmer`. No `.kanmer-skills-version`.
- `diff -rq plugins/kanmer/skills .claude/skills` → `Only in .claude/skills: run-kanmer`. Byte-identical otherwise.
- `.agents/skills/` and `.grok/skills/` do not exist in this repo.
- `130f837` deleted `kanmer-import/SKILL.md` AND renamed `kanmer-research/assets/impact-template.md` → `files-template.md`.
- `~/.claude/plugins/installed_plugins.json`: `installPath` = `cache/<marketplace>/<plugin>/<version>/`.
- `~/.codex/plugins/cache/<marketplace>/<plugin>/<version>/` — same shape.
- `plugins/kanmer/.claude-plugin/plugin.json` version = `0.1.0`; app is at 0.2.0.
- `.claude-plugin/marketplace.json` lives at the REPO ROOT, not under `plugins/kanmer/`; electron-builder.yml:22-23 packages only `plugins/kanmer`.
- `claude plugin --help` / `codex plugin --help` run clean; both have prune/remove verbs.
