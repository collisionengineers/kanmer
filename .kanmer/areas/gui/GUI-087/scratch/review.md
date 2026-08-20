# Independent review — GUI-087 / PR #75

## Changes reviewed

- Extracted `friendlyGateError` from `App.tsx` into `renderer/src/lib/gateError.ts`, then wired the existing shared `onMove` error path to that pure formatter.
- The formatter now recognizes the current core `cannot move from` prefix. It turns missing-requirement and governing-document recovery language into Ticket document-tab/readiness-panel actions, removes `set_ticket_doc` / `get_doc_gates`, preserves useful details, and leaves unrelated errors unchanged.
- Multi-boundary refusals retain the core’s next-stage detail while appending a GUI instruction to move one stage at a time and consult the readiness panel.
- Added four literal, current-`store.ts`-shaped formatter tests: missing document, questions-resolved, multi-boundary jump, and non-gate pass-through.
- Updated `docs/manual/gates.md` and the generated `manual/chapters.generated.ts` to describe the real human-facing banner behavior.

## Plan and context check

PASS. The diff exactly follows the GUI-local, presentation-only plan: core/MCP strings and gate logic remain unchanged, the shared failure path still handles all move entry points, and the manual artifact was regenerated rather than hand-authored. HZN-005 has no additional context document. The ticket is intentionally `docs_todo: true`, so no governing-document update is required.

## Checks

- Confirmed the formatter is invoked by `App.tsx`’s shared `onMove` catch path.
- Confirmed literal source strings in `packages/core/src/store.ts` match the tested missing-requirement and one-step refusal shapes.
- `npm test -w @kanmer/gui -- gateError.test.ts` — PASS, 4/4.
- `npm test -w @kanmer/gui -- manual.test.ts` — PASS, 11/11.
- `npm run check:manual` — PASS; 19 generated chapters current.
- `npm run typecheck -w @kanmer/gui` — PASS.
- `git diff --check main...HEAD` — PASS.
- `gh pr view 75` / `gh pr diff 75 --patch` — open, cleanly mergeable PR against `main`, containing exactly the five reviewed files; no reviews or comments.
- `gh pr checks 75` — no external checks reported.

## Comments and disposition

- Blocking: none.
- Non-blocking: no external PR checks are configured/reported. Independently rerun focused local test, manual freshness, and typecheck evidence is green; no PR action is required.

## Verdict

**PASS.** The stale sentinel is replaced by real core-message recognition, GUI users no longer receive MCP-only recovery instructions for the tested gate shapes, manual source/generated content agrees, and the implementation stays within the planned GUI boundary. Per review assignment, no merge or ticket move was performed.
