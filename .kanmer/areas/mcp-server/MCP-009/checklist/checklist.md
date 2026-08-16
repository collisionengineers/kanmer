# Checklist — MCP-009

*The checklist. Not the plan — every line is **independently tickable**; the
reasoning lives in the plan.*

Docs only. No file outside `docs/` may appear in the diff.

- [ ] Amend `research`: supersede Finding 4c with the adjudication verdict, fix the Antigravity column of Finding 5's table, and correct §"What this implies"
- [ ] Amend `research`: record the workspace-binding gate and its three non-gates (trust, git root, project existence) so MCP-015 inherits the evidence
- [ ] Amend `research`: record the `call_mcp_tool` / `list_resources` / `read_resource` triad as a general false-negative hazard, and note the marketplace-root and `.mcp.json` findings are owned by MCP-013 and GUI-079
- [ ] Replace ADR-0009 ¶19 with the amended clause: absence-of-evidence rule, check-the-binary method, verify-the-mechanism worked example, corrected three-host convergence note with the Antigravity binding caveat
- [ ] Add the binding caveat to ADR-0009 ¶9 (Context) and the inert-until-MCP-015 clause to Consequences
- [ ] Correct FRD-012 R2's install matrix against the measured evidence, naming MCP-013/014/015 for each gap
- [ ] Restate FRD-012 AC2 with the workspace-binding precondition and MCP-015 as owner
- [ ] Replace FRD-012 R5 with a pointer to the amended ADR-0009 clause and extend the `Related:` line
- [ ] Confirm FRD-012 is absent from `FROM_FRD` in `scripts/build-manual.mjs` (no `chapters.generated.ts` regeneration)
- [ ] Verification run: `npm test`, `npm run typecheck`, `npm run check:manual`, plus `git diff --stat` proving docs-only, plus the negative grep for the retired wrong lesson (this box produces proof.md)

## Progress notes

(append with `set_ticket_doc(doc: "checklist", append: true)`)
