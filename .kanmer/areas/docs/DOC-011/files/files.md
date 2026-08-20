# Files — DOC-011

## Add

| Path | Exact responsibility |
|---|---|
| `docs/architecture/adr/ADR-0016-compiled-workflow.md` | New cross-cutting decision: four audiences/artifacts, four readiness predicates over six stages, GitHub merge physics, compatibility rollout, custom-profile backfill policy, settled non-goals and consequences. Reallocate number if 0016 is no longer free at implementation time. |

## Modify

| Path | Required delta |
|---|---|
| `docs/functional/frd/FRD-002-requirement-profiles.md` | Four profile-resolved readiness predicates; no new stage; custom backfill policy as guidance, not runtime rejection. |
| `docs/functional/frd/FRD-003-ticket-documents.md` | Body/group context approval, gate-exempt review attestation in scratch, Scratch editor visibility, versions/multiple-doc behavior. |
| `docs/functional/frd/FRD-006-typed-proof.md` | Exact proof schema/attempts/outcomes, retained failures, exact merged-SHA detached verification, structural existence gate unchanged. |
| `docs/functional/frd/FRD-007-fixed-six-stage-board.md` | Map four predicates to existing boundaries; reserve/uninject `enter-verifying`; GitHub merge boundary without another stage. |
| `docs/functional/frd/FRD-010-task-scoped-dispatch.md` | `get_execution_packet` ready response is dispatch enablement; refusal/no-write/does-not-take semantics. |
| `docs/functional/frd/FRD-016-take-and-worktree-model.md` | Refuse actual/canonical board path; optional no-worktree remains; `force` unchanged; no lease. |
| `docs/functional/frd/FRD-019-gui-shell.md` | Scratch tab, first-group context pane, four local modes/starting-tab mapping/dim-not-hide, board-health banner. |
| `docs/functional/frd/FRD-020-board-git-worktree-sync.md` | Observational health block, expected branch, paired helpers, repair is ops/non-blocking. |
| `docs/functional/frd/FRD-022-mcp-server-surface.md` | 31 tools; fingerprint/optional write field/status blocks/exact three errors/packet shape and compatibility. |
| `docs/functional/frd/FRD-023-agent-skills-system.md` | Gates-first planning/auto, packet-first execute, SHA review/proof, detached verify, templates and stop conditions. |

## Board metadata mutations after files exist

Use Kanmer tools, not direct board-file edits:

| Ticket | Add refs | Then |
|---|---|---|
| MCP-022 | ADR-0016, FRD-022 | `docs_todo:false` |
| MCP-023 | ADR-0016, FRD-010, FRD-022 | `docs_todo:false` |
| GUI-096 | ADR-0016, FRD-003, FRD-019 | `docs_todo:false` |
| GUI-097 | ADR-0016, FRD-019 | `docs_todo:false` |
| GUI-098 | ADR-0016, FRD-019, FRD-020 | `docs_todo:false` |

Record returned ticket versions/paths and verify `get_doc_gates` governing-doc state remains passable.

## Inspect / verify

- All existing ADR/FRD neighbours and frontmatter conventions.
- `scripts/check-doc-numbering.mjs` and test.
- `plugins/kanmer/skills/kanmer-docs/assets/{adr,frd}.md`.
- MCP-022/023/024, SKILL-020/021/022, GUI-096/097/098 ticket plans for final exact shipped names.
- `MASTERPLAN.md` S-14 and Appendix A.

## Generated-file rule

`docs/contributing/doc-structure.md` must not be hand-edited. Run only the documented generator/reconciliation command if its source inputs belong to this ticket; otherwise leave it untouched and report the stale generated mirror separately. Never manually patch it to make verification green.

## Do not modify

- PRDs, unrelated ADRs/FRDs, source code, profiles/gates, board.yml, manual/generated chapters, package/lock/plugin files.
- Superseded root manifestos (deleted by MASTERPLAN adoption).
- Introduce a new FRD for the compiled workflow; cross-cutting decision is ADR-0016 and behavior is absorbed by existing FRDs.
