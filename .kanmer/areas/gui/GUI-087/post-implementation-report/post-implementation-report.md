# Post-implementation report — GUI-087

## Delivered

- Moved the gate-error adapter into testable `lib/gateError.ts` and wired App’s shared move failure path to it.
- It recognizes current core `cannot move from` errors, replaces agent-only tool instructions with Ticket-tab/readiness-panel guidance, preserves useful missing-requirement and open-question details, and leaves non-gate errors unchanged.
- Updated the gates manual and regenerated the bundled manual chapters.

## Verification

- `npm test -w @kanmer/gui -- gateError.test.ts` — 4 passed.
- `npm test -w @kanmer/gui -- manual.test.ts` — 11 passed.
- `npm run check:manual` — generated manual current.
- `npm run typecheck -w @kanmer/gui` — passed.
- `git diff --check` — clean.
