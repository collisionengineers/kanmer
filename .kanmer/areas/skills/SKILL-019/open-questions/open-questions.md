# Open questions — SKILL-019

- [x] **Should every Kanmer project carry Codex path-disable configuration?** — No. The user explicitly rejected that operational model.
- [x] **What is Codex Connect’s canonical skill surface?** — Project-local .agents/skills, shared with Antigravity. Connect no longer installs the Codex plugin.
- [x] **Where does OpenCode receive the roster?** — Its native .opencode/skills project directory.
- [x] **Does the Codex plugin disappear?** — No. It remains an independently installable distribution option, but users choose plugin or project-local Connect rather than Kanmer combining both.
- [x] **How are existing plugin installs migrated?** — One-time detection plus an explicit supported disable/uninstall instruction or confirmed action. Never silently remove global state that may support other projects; validate the exact installed-Codex mechanism before implementation.

## Parked (explicitly deferred)

No questions parked.
