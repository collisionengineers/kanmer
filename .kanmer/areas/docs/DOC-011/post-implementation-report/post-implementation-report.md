# Post-implementation report — DOC-011

## Summary

Adds ADR-0016 and durable compiled-workflow end-state deltas to the ten scoped FRDs. The historical “Verified against code” material remains intact; the new sections explicitly distinguish the accepted target contract from earlier shipped-state evidence.

## Changes

| File | Change | Why |
|---|---|---|
| `docs/architecture/adr/ADR-0016-compiled-workflow.md` | added | Records one cross-cutting decision: four audience contracts, four existing-boundary predicates, GitHub merge physics, compatibility, and non-goals. |
| `docs/functional/frd/FRD-002-requirement-profiles.md` | modified | Defines predicate naming without duplicating resolved-profile authority. |
| `docs/functional/frd/FRD-003-ticket-documents.md` | modified | Assigns existing ticket/group, scratch, and proof artifacts to their audiences. |
| `docs/functional/frd/FRD-006-typed-proof.md` | modified | Specifies exact-merged-SHA, versioned typed proof records and structural FAIL handling. |
| `docs/functional/frd/FRD-007-fixed-six-stage-board.md` | modified | Preserves six stages and reserves uninjected `enter-verifying`. |
| `docs/functional/frd/FRD-010-task-scoped-dispatch.md` | modified | Defines the read-only execution packet boundary. |
| `docs/functional/frd/FRD-016-take-and-worktree-model.md` | modified | Defines normalized board-worktree path refusal without leases. |
| `docs/functional/frd/FRD-019-gui-shell.md` | modified | Defines Scratch/context/mode and non-blocking health-banner end state. |
| `docs/functional/frd/FRD-020-board-git-worktree-sync.md` | modified | Defines observational paired board-worktree health. |
| `docs/functional/frd/FRD-022-mcp-server-surface.md` | modified | Defines the 31-tool, fingerprint/error/status/packet target contract. |
| `docs/functional/frd/FRD-023-agent-skills-system.md` | modified | Defines gates-first, packet-first, SHA-bound skill choreography. |

## Governing docs

This ticket creates ADR-0016 rather than a new feature FRD because the compiled workflow is a cross-cutting decision. It links the ten amended FRDs in the ADR. The chore profile requires no governing-doc ref on DOC-011 itself.

## Risks / follow-ups

The five target-ticket `refs` and `docs_todo:false` updates cannot be made before merge: MCP validates repo-document paths against the source checkout on `main`, where this branch’s new ADR/FRD content does not yet exist. Review/verification must apply the documented mappings after the PR has merged, re-read each ticket, and confirm gates. This is a path-validation ordering constraint, not a skipped mutation.

`npm run verify` is also intentionally unavailable on current merged main until [[CORE-031]] lands; verification should run it after that merge. No generated document was edited.

## Verification hand-off

On merged main:

```powershell
node scripts/check-doc-numbering.mjs
npm test
npm run verify
git diff --check
```

Confirm ADR-0016 plus the ten FRD end-state sections contain no contradictory current-state claims; apply and verify the documented refs/docs_todo mapping for [[MCP-022]], [[MCP-023]], [[GUI-096]], [[GUI-097]], and [[GUI-098]].

## Post-merge verification reconciliation — 2026-08-21

Merged main under verification was `12708f9d375f29b5787f04a1497225a76621f96b` (the DOC-011 PR #81 merge `920ecf957e51ccc299b21ff4ee88d9e0ee24e81d` is an ancestor).

The five planned Kanmer metadata mappings were already present and were re-read without rewriting:
- MCP-022 — `docs/architecture/adr/ADR-0016-compiled-workflow.md`, `docs/functional/frd/FRD-022-mcp-server-surface.md`, `docs_todo:false`; refs updates recorded at 2026-08-20T22:27:27.631Z–2026-08-20T22:27:27.650Z and docs_todo at 2026-08-20T22:27:36.515Z.
- MCP-023 — `docs/architecture/adr/ADR-0016-compiled-workflow.md`, `docs/functional/frd/FRD-010-task-scoped-dispatch.md`, `docs/functional/frd/FRD-022-mcp-server-surface.md`, `docs_todo:false`; refs updates recorded at 2026-08-20T22:27:27.668Z–2026-08-20T22:27:27.706Z and docs_todo at 2026-08-20T22:27:36.529Z.
- GUI-096 — `docs/architecture/adr/ADR-0016-compiled-workflow.md`, `docs/functional/frd/FRD-003-ticket-documents.md`, `docs/functional/frd/FRD-019-gui-shell.md`, `docs_todo:false`; refs updates recorded at 2026-08-20T22:27:27.726Z–2026-08-20T22:27:27.779Z and docs_todo at 2026-08-20T22:27:36.542Z.
- GUI-097 — `docs/architecture/adr/ADR-0016-compiled-workflow.md`, `docs/functional/frd/FRD-019-gui-shell.md`, `docs_todo:false`; refs updates recorded at 2026-08-20T22:27:27.803Z–2026-08-20T22:27:27.829Z and docs_todo at 2026-08-20T22:27:36.556Z.
- GUI-098 — `docs/architecture/adr/ADR-0016-compiled-workflow.md`, `docs/functional/frd/FRD-019-gui-shell.md`, `docs/functional/frd/FRD-020-board-git-worktree-sync.md`, `docs_todo:false`; refs updates recorded at 2026-08-20T22:27:27.887Z–2026-08-20T22:27:27.932Z and docs_todo at 2026-08-20T22:27:36.581Z.

Fresh `get_doc_gates` reads for all five report the governing-doc requirement satisfied; no duplicate refs are present.

Merged-main checks:
- `node scripts/check-doc-numbering.mjs` — exit 0; `doc-numbering OK — ADR, FRD, PRD each have exactly one file per number`.
- First `npm test` attempt — exit 1; core 256/256 and GUI 337/337 passed, while HTTP was 59/61 with `http.test.mjs` child `ETIMEDOUT` and one tunnel-readiness timeout. This failure is retained, not erased.
- Focused HTTP rerun — exit 1; HTTP 60/61, with only the same child `ETIMEDOUT`; `node --test src/http.test.mjs` separately passed 5/5.
- Second full `npm test` attempt — exit 0; core 256/256, GUI 337/337, HTTP 61/61, scripts 66/66.
- `npm run verify` — exit 0; build, tests, typecheck, smoke 184/184, protocol 42/42, discovery 13/13, skills, AGENTS block 31/31, and plugin synchronization all passed.
- `git diff --check` — exit 0; main remained clean except preserved untracked `skills-lock.json`.

No generated `docs/contributing/doc-structure.md`, product code, board configuration, package, lockfile, or plugin artifact was changed by verification.
