---
id: SKILL-018
type: ticket
title: Fix kanmer-report's frontmatter so Antigravity loads all 12 skills
status: done
area: skills
order: 1200
assignee: claude-code
profile: fix
stageEntered:
  preparing: '2026-08-16T22:27:03.931Z'
  review: '2026-08-16T22:42:25.758Z'
  verifying: '2026-08-16T22:44:14.149Z'
  done: '2026-08-16T22:57:48.374Z'
labels:
  - install
  - bug
groups:
  - HZN-003
links: []
refs:
  - docs/functional/frd/FRD-023-agent-skills-system.md
commits:
  - 6c81860
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/42'
archived: false
created: '2026-08-16T22:08:48.761Z'
updated: '2026-08-16T23:19:36.384Z'
---

## What

`plugins/kanmer/skills/kanmer-report/SKILL.md:3` has an unquoted `": "` inside its
YAML `description:` value. Antigravity's YAML parser rejects the document, logs a
parse failure, and loads **11 of 12** `kanmer-*` skills.

Quote the value (or restructure the description so it carries no bare `": "`), and
add a rail check so no skill's frontmatter can break a host's parser again.

## Why

Found while researching [[GUI-073]], by running the real `agy` CLI (1.1.13) against
a planted skill tree rather than by reading the file. Anyone who connects
Antigravity today silently loses a skill — there is no error in Kanmer's UI, and
the agent simply behaves as though `kanmer-report` does not exist.

This is a one-line defect with a disproportionate effect, and it belongs in 0.3.3
because that release is about installs that actually work. It is also the exact
failure class the release keeps finding: an artifact that looks fine to the tool
that wrote it and is rejected by the tool that reads it.

The rail check is the more valuable half. YAML frontmatter is parsed by five
different hosts with five different parsers, and Kanmer has no test that any skill
file is loadable by any of them. A check that every `SKILL.md` frontmatter parses
under a strict YAML parser would have caught this before it shipped.

## Approach

- Fix `kanmer-report/SKILL.md:3`. Prefer restructuring the sentence over adding
  quotes if the description reads better for it — five parsers, one of which is
  strict, is an argument for prose that needs no escaping.
- Sweep the other 11 skills for the same hazard rather than fixing only the one
  that was caught.
- Add the frontmatter parse check to an existing rail (`plugin:check` is the
  natural home — it already validates the plugin bundle).
- Note that `.claude/skills/` is a gitignored install artifact; the source of
  truth is `plugins/kanmer/skills/`.

## Verification

- [x] `agy` loads 12 of 12 `kanmer-*` skills, evidenced by the skill list from a
      project-bound session — not by reading the file and assuming.
- [x] Every `SKILL.md`'s frontmatter parses under a strict YAML parser, asserted
      by a rail check that fails on a deliberately broken fixture.
- [x] No skill's description was shortened in a way that loses its routing value —
      the description is what a host matches on.

## Outcome

Shipped as PR [#42](https://github.com/collisionengineers/kanmer/pull/42) (squash-merged
`fc2045b`). `kanmer-report/SKILL.md`'s description restructured (colon → em dash, no
quoting) to drop the two colon-space sequences a plain YAML scalar can't legally
contain. The other 11 skills were swept and found clean — no other content change.
`scripts/check-plugin-sync.mjs` gained a third, self-contained check
(`checkSkillFrontmatter()`) that strict-parses every skill's frontmatter with the
`yaml` package (already a workspace dependency, no new dependency added); demonstrated
failing on a reintroduced broken fixture and passing clean on the fix. Real `agy` 1.1.13
verified 11/12 before → 12/12 after on merged main, with a positive control (breaking a
different skill, `kanmer-auto`, and confirming only it drops out) proving the detection
method is sound. No follow-up tickets filed by this ticket. Two things noted for
awareness but explicitly out of scope: (1) `.agents/skills/` and `.agents/mcp_config.json`
(Antigravity's install artifacts) are untracked in the main checkout but not listed in
`.gitignore`, unlike their `.claude/skills/` / `.mcp.json` counterparts — worth its own
ticket if confirmed to bite `scripts/release.mjs`'s dirty-tree check; (2) a stale local
`packages/core/dist` (gitignored build output, unrelated to this ticket) briefly caused
spurious `typecheck` failures both in the ticket's worktree and, after pulling unrelated
upstream changes, in the main checkout — resolved locally each time per AGENTS.md §8's
documented worktree/rebuild trap, no code change needed.
