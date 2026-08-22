# Plan — GUI-110: Make browser demo settings include dispatch configuration

## Approach

Add the smallest compatible fixture value to `packages/ui/src/demo.tsx`: `dispatch: { providers: {} }` in the existing demo settings object. This mirrors the GUI-075 AppSettings contract while representing the browser demo's honest lack of provider configuration. The object is already returned and spread by every demo settings bridge method, so one field fixes all type errors. Changing the shared type, adding provider behavior, or weakening the typecheck would broaden scope and hide the exact hosted regression.

## Governing docs

No PRD, FRD, or ADR is linked. GUI-110 is a narrow typecheck remediation for the GUI-075 implementation and changes no user-facing or provider contract. The ticket's `docs_todo` flag is retained as the explicit board disposition; this plan does not modify governing documentation.

## Steps

1. Add `dispatch: { providers: {} }` to the browser demo's settings literal in `packages/ui/src/demo.tsx`, preserving all existing values and bridge methods.
2. Run all-workspace typecheck, focused `@kanmer/ui` validation, relevant GUI tests, and `git diff --check`; record exit codes and preserve the original hosted PR #142 failure evidence.
3. Write the post-implementation report, record the commit, push a dedicated branch, open a PR, and move GUI-110 to Review for independent review; stop before merge.

## Verification

Run `npm run typecheck`, `npm run typecheck -w @kanmer/ui`, the focused GUI/UI test commands applicable to this fixture, and `git diff --check`. The stacked GUI-075 branch should clear the original `Property 'dispatch' is missing` errors while retaining the GUI 355/355, MCP HTTP 61/61, and scripts 80/80 rails.

## Risks / open questions

- The empty provider map must remain empty: the browser demo cannot safely claim provider execution or model support.
- The standalone remediation branch may not require the field in `main` before GUI-075 is stacked; the PR must be evaluated on the GUI-075 contract branch as well.
- No unresolved questions remain.
