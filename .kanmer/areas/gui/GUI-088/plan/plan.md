# Plan — GUI-088: ensure AGENTS.md for every Connect provider

## Approach

Treat FRD-012 R3 and ADR-0009 as the governing contract: move the existing `ensureAgentsBlock(projectRoot)` call so it runs for marketplace and copy-skills providers before the install-kind split. Preserve the marketplace command ordering and its `ok: false` error path. Add the same explicit block-ensured note to marketplace output.

Keep marketplace disconnect non-destructive for AGENTS.md. The current `disconnectAgent` only removes the block in the copy-skills branch; R4 says not to remove it without asking. Add a focused regression assertion for that retained-block policy rather than changing cleanup scope.

## Governing docs

- `docs/functional/frd/FRD-012-connect.md` R3 is the direct requirement: every provider writes the marker-delimited, idempotent block. R4 supports retaining it on marketplace disconnect absent an explicit user interaction.
- `docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md` establishes AGENTS.md as universal orientation above best-effort skills.
- These refs are already linked by the ticket; no governing-document change or `docs_todo` is needed.

## Steps

1. In `apps/gui/src/main/connect.ts`, ensure the managed block before the marketplace early-return path, without altering existing atomic/block-format helpers or the registration sequence.
2. Make marketplace install notes include `AGENTS.md block ensured` alongside their plugin-install notes; retain stop-on-first-failure and exact command/output propagation.
3. Extend the synthetic marketplace-provider tests in `apps/gui/src/main/connect.test.ts` to verify first Connect creates the block, second Connect is byte-identical, and the success output names the ensured block.
4. Add a marketplace-disconnect assertion that the managed block remains present and document this as the R4 non-destructive policy; leave copy-skills peer cleanup tests unchanged.
5. Run the focused GUI Connect test, GUI typecheck, and relevant managed-block script tests. Confirm the regression covers both the universal-install requirement and the visible failure contract.

## Verification

- `npm test -w @kanmer/gui -- connect.test.ts`
- `npm run typecheck -w @kanmer/gui`
- `node --test scripts/verify-agents-block.mjs` (or the repository's existing managed-block test command if its file naming differs)
- Inspect that a marketplace test reads an AGENTS.md with managed markers after the first connect and exact same bytes after the second.
- Inspect that marketplace command failure remains `ok: false`, while the successful marketplace result includes the block-ensured note.

## Risks / open questions

- Calling the block write before a marketplace command means a later command failure can leave the block present; this matches Connect's existing independent registration-first behavior and must remain transparent through `ok: false`.
- No open questions remain.
