# Checklist — SKILL-014

*The checklist. Not the plan — every line is **independently tickable**; the reasoning lives in the plan.*

- [x] Correct the ticket body's `kanmer-import` claim (withdrawn by the audit)
- [x] Correct `kanmer-review/SKILL.md:48` — keep the warning, fix the false clause
- [x] Add `get_doc_gates` to `kanmer-review`'s gather step
- [x] Sweep `tool-reference.md`: `priority` out, `profile`/`groups` in, six fixed stages, format 3, folder-per-doc-type diagram — tool table untouched
- [x] Sweep the three `impact` sites (plan-template, pr-review, doc-structure)
- [x] `## Workflow` + closing hand-off in all twelve SKILL.md files
- [x] AGENTS block route line in **both** `BLOCK_BODY` copies, then run the script on this repo's AGENTS.md
- [x] Re-run the R1 acceptance grep and justify every surviving hit
- [x] `npm run build` → `plugin:check` *(pre-verified only — see notes; runs for real at verify)*
- [x] Verification run: the seven checks + the rail (this box produces proof.md)
- [x] Push, open the PR, record commits/prs

## Progress notes

**2026-08-16 — plan correction, step 9.** The plan says "rebuild the plugin
bundle at the repo root". Reading `scripts/build-plugin.mjs` while working: it
copies **only** `packages/mcp-server/dist/standalone/kanmer-mcp.cjs` into
`plugins/kanmer/mcp/`. The skills are not copied anywhere — `plugins/kanmer/skills/`
*is* the shipped location, so a skills-only change needs no `plugin:build` at all.

`plugin:check` still matters and still runs: `check-plugin-sync.mjs:26` reads
`tool-reference.md` and asserts the tool names in it match the registered tools.
Editing that file can break it. It needs `npm run build` first (it compares the
committed bundle against a fresh one), not `plugin:build`.

Step 9 is therefore `npm run build` → `plugin:check`, not `plugin:build`. The
worktree trap the step was guarding against ([[SKILL-011]]) does not apply,
because nothing is being bundled.

**2026-08-16 — the "every skill names its successor" rule, as actually applied.**
A skill passes with an ordered workflow (an explicit `## Workflow`, **or** the
numbered `## N.` headings four skills already use as their structure) and an
ending that names what comes next. Service skills name their callers and where
control returns; `kanmer-closeout` says the pipeline ends. Duplicating a numbered
list above sections that already are the numbered steps would be exactly the
restatement FRD-023 R1 warns against.

**2026-08-16 — two verification checks were tightened after failing.** The stage
check flagged "Research and planning share that stage", which is correct English
about the Preparing stage; narrowed to arrow-separated sequences and quoted
status ids. The hand-off check read the last 6 lines and missed `kanmer-auto`,
whose ending is a paragraph, a route diagram and another paragraph; widened to
14. Neither loosened what is measured, and both are written into the report
rather than left in the shell history — a check adjusted until it passes is the
thing a reviewer should be suspicious of.

**2026-08-16 — three R1 hits removed, not added.** The pre-change grep found 8
boundary mentions; after the corrections to `kanmer-review` and `kanmer-auto`
there are 5. Adding prose to twelve skills was the plan's stated risk to R1, and
it ended up net-negative.

**2026-08-16 — PR [#34](https://github.com/collisionengineers/kanmer/pull/34)
opened**, commit `bc3b201`, 18 files, +237 −42, no `packages/` source touched.
