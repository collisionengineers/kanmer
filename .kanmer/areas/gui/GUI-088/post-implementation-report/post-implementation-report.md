# Post-implementation report — GUI-088

## Summary

Connect now writes/refreshes the shared AGENTS.md managed block before choosing a marketplace or copy-skills install path. Claude and codex marketplace connects therefore satisfy FRD-012 R3, show the side effect in their result text, and retain the existing non-destructive marketplace-disconnect behavior.

## Changes

| File | Change | Why |
|---|---|---|
| `apps/gui/src/main/connect.ts` | Moved the existing managed-block write before the install-kind branch and seeded marketplace notes with `AGENTS.md block ensured`. | Prevents marketplace hosts from taking the early return before universal orientation is installed, while preserving ordered command execution and failure reporting. |
| `apps/gui/src/main/connect.test.ts` | Added a synthetic marketplace regression that checks block creation, byte-stable reconnect, visible success note, and block retention after disconnect. | Proves the R3 universal-write rule and makes the R4 non-destructive disconnect policy explicit. |

## Governing docs

- `docs/functional/frd/FRD-012-connect.md` R3 is met because the managed block is now written for marketplace and copy-skills providers. R4 is respected because marketplace disconnect still does not remove AGENTS.md without an explicit interaction.
- `docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md` is met because the universal orientation layer is installed independently of optional/on-demand skill delivery.
- No governing documents were modified; the ticket's existing references remain authoritative.

## Risks / follow-ups

- A marketplace command can fail after Connect has written the block, just as registration can already succeed before a later install failure. The result remains `ok: false` with the exact failing command and output, so this side effect is not hidden.
- Broader redesign of copy-skills cleanup and adding an explicit AGENTS.md removal confirmation are out of scope.

## Verification hand-off

On merged `main`, run:

- `npm test -w @kanmer/gui -- connect.test.ts` — expected: 22 tests pass, including marketplace managed-block creation/idempotence/retention.
- `npm run typecheck -w @kanmer/gui` — expected: both GUI TypeScript projects pass.
- `npm run verify:agents-block` — expected: 28/28 managed-block checks pass.

Author-run results before PR: focused Connect tests passed (22/22), GUI typecheck passed, and managed-block verification passed (28/28).
