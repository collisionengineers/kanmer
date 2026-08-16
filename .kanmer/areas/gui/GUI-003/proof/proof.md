# Proof

Branch `v3-phase-minus-1-prework` at `41f9ee6`.

- Tests assert opencode and antigravity both resolve to `copySkills` / project /
  `.agents/skills`, and that Grok resolves to `.grok/skills`.
- Kanmer's skill frontmatter (`name` + `description`, directory-matching name)
  satisfies both hosts' documented requirements — checked against the roster.
- Full rail: 116 core / 112 GUI, typecheck, GUI build, boot smoke exit 0.

**Not proven here:** a `/skills` listing in a live opencode or Antigravity
session. That needs the packaged app to run a real connect against a real
project — release-time verification, same as GUI-002's.
