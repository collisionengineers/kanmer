# Checklist — SKILL-014

*The checklist. Not the plan — every line is **independently tickable**; the reasoning lives in the plan.*

- [ ] Correct the ticket body's `kanmer-import` claim (withdrawn by the audit)
- [ ] Correct `kanmer-review/SKILL.md:48` — keep the warning, fix the false clause
- [ ] Add `get_doc_gates` to `kanmer-review`'s gather step
- [ ] Sweep `tool-reference.md`: `priority` out, `profile`/`groups` in, six fixed stages, format 3, folder-per-doc-type diagram — tool table untouched
- [ ] Sweep the three `impact` sites (plan-template, pr-review, doc-structure)
- [ ] `## Workflow` + closing hand-off in all twelve SKILL.md files
- [ ] AGENTS block route line in **both** `BLOCK_BODY` copies, then run the script on this repo's AGENTS.md
- [ ] Re-run the R1 acceptance grep and justify every surviving hit
- [ ] `npm run plugin:build` **at the repo root**, then `plugin:check`
- [ ] Verification run: the seven greps + the full rail (this box produces proof.md)
- [ ] Push, open the PR, record commits/prs

## Progress notes

(append with `set_ticket_doc(doc: "checklist", append: true)`)

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
