# Plan — SKILL-018: Fix kanmer-report's frontmatter so Antigravity loads all 12 skills

## Approach

Two independent deliverables, both already scoped tightly by the ticket: (1) a
one-line content fix to `kanmer-report/SKILL.md`'s `description:`, restructured
rather than quoted, since prose that needs no escaping survives more parsers
than prose that is correctly escaped; and (2) a rail check in
`scripts/check-plugin-sync.mjs` that parses every skill's frontmatter with a
strict YAML parser (the `yaml` npm package, already a workspace dependency —
confirmed reproduces the exact real-world failure agy hit) so this defect class
can't ship silently again. Research (recorded in scratch, not gated for this
`fix` profile) already confirmed: only `kanmer-report` has the hazard among all
12 skills, checked both by parser and by grep; the real `agy` CLI drops exactly
that one skill (11/12) with a logged parse error that matches the `yaml`
package's error.

## Governing docs

`refs: ["docs/functional/frd/FRD-023-agent-skills-system.md"]` (already linked
at ticket creation).

- **Meets**: FRD-023 (agent skills system) governs how `SKILL.md` files are
  authored and distributed to hosts. This ticket makes an existing skill file
  actually loadable by a host that was silently dropping it, and closes the gap
  the FRD implicitly assumes (all shipped skills are loadable) but never
  enforced. No requirement in FRD-023 is modified — the fix and the rail check
  both operate at a mechanical level (YAML syntax validity) below the FRD's
  content-level concerns (skill descriptions, routing behavior). No new ADR is
  needed: this isn't a design decision, it's a bug fix plus a lint rail, both
  fully anticipated by "skills must be well-formed" already implicit in
  FRD-023's premise that hosts load `SKILL.md` files as-is.

## Steps

1. Take the ticket into `.worktrees/skill-018` on branch `skill-018-skill-frontmatter`
   off `origin/main` (`kanmer-execute`).
2. Fix `plugins/kanmer/skills/kanmer-report/SKILL.md:3`: replace the two
   `"now": ` / `"since <period>": ` colon-space constructs with an em dash
   (`now — in flight/blocked/up next` / `since <period> — what shipped,
   throughput`). No quoting added; no routing terms removed.
3. Confirm (already done in research, re-verify on the worktree copy) that the
   other 11 `SKILL.md` files have no instance of the same hazard — no edits
   needed there.
4. Add a frontmatter-parse check to `scripts/check-plugin-sync.mjs`: import the
   `yaml` package, glob `plugins/kanmer/skills/*/SKILL.md`, extract each file's
   `---`-delimited frontmatter block, `YAML.parse()` it, and collect failures.
   On any failure, print the file path and the parser's message and
   `process.exit(1)`, consistent with the file's existing two checks (clear
   message naming what's wrong and where). On success, fold the count into the
   existing summary line.
   - Keep this as a clearly separated, self-contained block (its own small
     function, e.g. `checkSkillFrontmatter()`, called once near the top or
     bottom of the existing checks) — not interleaved with the tool-name or
     bundle-bytes checks — since MCP-007 is adding a worktree guard to the same
     file concurrently and needs a clean rebase.
5. Prove the new check actually fails on a broken fixture (not just "looks
   right"): temporarily point the check (or a throwaway copy of its parse
   function in a scratch script) at a deliberately broken fixture — e.g. the
   original broken `kanmer-report/SKILL.md` text, or a small synthetic fixture
   file under a scratch/tmp path — confirm non-zero exit, then confirm the real
   `npm run plugin:check` passes clean against the fixed repo tree.
6. Run the rail: `npm test`, `npm run typecheck`, `npm run plugin:check`.
7. Real-CLI verification (the ticket's actual bar):
   - BEFORE (already captured, pre-fix, from the main checkout's pre-existing
     `.agents/skills/` tree + `agy --new-project --log-file <log> -p "list
     kanmer-* skills"`): 11/12, `kanmer-report` missing, log shows the parser
     error.
   - AFTER: copy the fixed `kanmer-report/SKILL.md` into `.agents/skills/`,
     re-run the same `agy --new-project -p "..."` prompt from the same cwd:
     expect 12/12 with `kanmer-report` present and no parse-error log lines.
   - Positive control: with the fix in place, temporarily reintroduce a
     colon-space hazard into a *different*, previously-clean skill's installed
     copy (e.g. `.agents/skills/kanmer-auto/SKILL.md`) and re-run the same
     prompt — confirm that skill (and only that one) drops out, proving the
     before/after methodology is actually sensitive to breakage and not a
     fluke of caching or prompt phrasing. Revert immediately after.
   - Restore `.agents/skills/` to its original pre-existing bytes afterward
     (md5 `4e780d1ec1ce2a3900df08f40e78ce5c` for `kanmer-report/SKILL.md`,
     hashed before this ticket touched it) and verify the hash matches again —
     it's borrowed machine state in a shared main checkout, not part of this
     ticket's diff.
8. Write the post-implementation report, open the PR.
9. Review (both author and reviewer, self-declared), merge with `gh pr merge`.
10. `move_item verifying`, write `proof.md` on merged main with the real
    before/after `agy` transcripts and rail output, `move_item done`.
11. Closeout from the main checkout: remove worktree, delete branch.

## Verification

- `npm test`, `npm run typecheck`, `npm run plugin:check` all green.
- `npm run plugin:check` demonstrated failing against a deliberately broken
  fixture (screenshot/output captured in proof.md), then passing clean.
- Real `agy` (1.1.13) skill list from a project-bound session: 11/12 before
  (with logged parse error), 12/12 after (no parse-error log lines) — both
  captured verbatim in `proof.md`.
- Positive control demonstrating the detection method actually detects a
  reintroduced hazard.
- `.agents/skills/kanmer-report/SKILL.md` restored to its original bytes,
  hash-verified.

## Risks / open questions

- Risk: the chosen restructuring (em dash) could read as a stylistic downgrade.
  Mitigation: it preserves every routing term verbatim ("now", "since
  <period>", all the quoted trigger phrases) — only the colon inside the two
  parentheticals changes to a dash, which reads at least as naturally.
- Risk: `.agents/skills/` is shared, untracked, non-ignored machine state in a
  main checkout other agents are concurrently using. Mitigation: hash-verify
  restore; never touch anything else in that checkout (confirmed via `git
  status` that `AGENTS.md`, `.codex/`, `icon.png`, `logo.png` are unrelated
  in-flight changes from other sessions — leave them untouched).
- No open question for the user: the ticket's approach section already answers
  every design choice (restructure over quote, sweep don't just fix, rail in
  `plugin:check`). `questions-resolved` gate already reports satisfied.
