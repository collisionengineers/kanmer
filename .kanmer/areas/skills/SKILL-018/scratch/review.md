**Both author and reviewer — self-review, not independent.**

## Changes (reviewer's own read of the diff, PR #42)

1. `plugins/kanmer/skills/kanmer-report/SKILL.md` — one-line change to the
   `description:` value: `"now": ` → `now — `, `"since <period>": ` →
   `since <period> — `. Nothing else in the file touched.
2. `scripts/check-plugin-sync.mjs` — adds a third check: `checkSkillFrontmatter()`
   globs `plugins/kanmer/skills/*/SKILL.md`, regex-extracts each `---`-delimited
   frontmatter block, parses it with the `yaml` package, collects file+message
   for any parse failure, and `process.exit(1)`s with all of them listed if any
   exist. Wired in after the existing bundle-bytes check, before the final
   success log (which now also reports the skill count). Header comment and
   import list updated to match (three ways now, `readdirSync` + `yaml` import
   added).

## Comments

1. (non-blocking, verified not an issue) Frontmatter-extraction regex
   `^---\r?\n([\s\S]*?)\r?\n---` assumes the file starts with `---` on line 1 —
   true for all 12 current skill files, and a file that doesn't match correctly
   becomes its own reported error (`no --- frontmatter block found`) rather than
   silently passing. No fix needed.
2. (non-blocking) No unit test exercises `check-plugin-sync.mjs` directly —
   consistent with the file's existing two checks, which are likewise only
   proven by running the script. Proven instead by executing the real check
   against a deliberately broken fixture (fail, exit 1) and then the fix
   (pass, exit 0) — see PR verification section and SKILL-018's checklist
   progress notes for the exact transcripts.
3. (non-blocking) `yaml` is added as an `import` in a root-level script without
   being a declared dependency of the root `package.json` — relies on npm
   workspace hoisting from `packages/core`/`apps/gui`, which already held
   before this change (verified: `node -e "require('yaml')"` resolves from
   repo root on a stock `npm install`, no new dependency was added). Noted in
   the files doc as a deliberate, low-risk choice rather than adding a new
   direct dependency for one script.
4. (non-blocking) Diff is exactly the two files the plan/files docs scoped —
   no other skill content touched, matching the "sweep, don't fix what isn't
   broken" approach and keeping the diff tight for MCP-013's rebase.

No blocking comments. No PR Review tickets filed.

## Governing docs

`refs: FRD-023-agent-skills-system.md`. Plan's Governing-docs section claims
**Meets**, not modify/new-ADR — checked against the diff: both changes are
mechanical (YAML syntax legality), below FRD-023's content-level concerns
(skill descriptions/routing). Holds.

## Verdict: PASS

Report matches diff exactly (2 files, matches the Changes table). Rail green
(`npm test` 423/423, `npm run typecheck` all 4 workspaces, `npm run
plugin:check` — including the new check demonstrated failing then passing on
a real broken/fixed fixture). Real-CLI before/after + positive control from
`agy` 1.1.13 satisfies the ticket's actual bar (not a read-the-file claim).
No routing value lost in the description. Merging.
