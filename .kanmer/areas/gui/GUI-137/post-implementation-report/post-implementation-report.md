# Post-implementation report — GUI-137

## Result

RemoteAccessManager now canonicalizes every externally supplied project id before it becomes a record/queue key, persisted registration id, status id, delivery binding, or runtime correlation id. Auto-start and opened Windows path spellings therefore converge on one owned process.

## Files changed

- `apps/gui/src/main/remoteAccess/manager.ts` — uses the existing canonical path helper at the ownership boundary and normalizes internal runtime operations.
- `apps/gui/src/main/remoteAccess/manager.test.ts` — adds an auto-start/open/manage regression proving one spawn and one loopback-ready record.

## Governing docs

Restores FRD-025's one-runtime-per-canonical-project ownership and restart/autostart management contract.

## Verification

- First focused test before building core: FAIL, dependency entry unavailable in the fresh worktree.
- `npm run build:core`: PASS.
- First focused run after build: 10/11 PASS; an older fixture used an intentionally inconsistent `/repo` id and real temp repo root. The fixture was corrected to use its actual project root and assert the existing canonical helper.
- Final manager tests: PASS 11/11.
- GUI typecheck: PASS.
- Full build: PASS.
- `git diff --check`: PASS.

## Commit

`fbcd39e4f6f5a2767d8bc62fcf9bd487d02b3f58`

## Verification handoff

Install the exact merge, restart the app with the normal Windows project path, confirm auto-start produces one canonical ready record, run doctor from the opened project, and repeat public missing/wrong/valid bearer MCP checks plus session close.
