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
