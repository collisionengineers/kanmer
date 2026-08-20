# Research — GUI-088: universal AGENTS.md block for marketplace hosts

## Question

Does Connect or FRD-012 R3 define the intended behaviour for Claude Code and codex marketplace installs, and what must happen on disconnect?

## Findings

- `apps/gui/src/main/connect.ts:364-400` returns from the `marketplace` branch of `installSkills` before reaching `ensureAgentsBlock(root)` at line 382. Claude and codex are the two marketplace providers, so neither currently creates nor refreshes the managed block.
- `FRD-012-connect.md` R3 explicitly requires the marker-delimited, idempotent AGENTS.md managed block for **every provider**. ADR-0009 places it above skills as the universal always-in-context orientation layer. These two governing documents agree; the code is the divergent side.
- `ensureAgentsBlock` already uses the shared pure `applyManagedBlock` helper and atomic writes. Calling it twice preserves a byte-stable managed result, so no new block-format logic is needed.
- Marketplace output currently reports only `plugin installed`; copy-skills output already names `AGENTS.md block ensured`. A marketplace result should likewise state that visible side effect.
- `disconnectAgent` only calls `dropAgentsBlock` inside the `copySkills` branch. Thus marketplace disconnect currently retains an existing block. That is consistent with FRD-012 R4's “never the AGENTS block without asking” guard; this ticket should make that retention explicit and test it, rather than broaden disconnect cleanup.
- `connect.test.ts` already has a synthetic marketplace-provider harness and real local successful/failing commands, but has no test that a marketplace connection writes or idempotently refreshes AGENTS.md.

## Decision

FRD-012 R3 and ADR-0009 are correct; `connect.ts` is wrong. Fix the implementation only: ensure the block before branching on the install kind, preserve marketplace failure reporting, and append the same “AGENTS.md block ensured” result note. No governing-document amendment is required.

## Implications

- A successful Claude or codex Connect now creates/refreshes the shared block just as copy-skills hosts do.
- A failed marketplace command may still follow the registration and block write already performed by Connect; the result remains `ok: false` and names the failed command, so no failure is hidden.
- Marketplace disconnect remains non-destructive for AGENTS.md. This is deliberate retention, not a prerequisite for this narrowly-scoped install fix; it must be asserted so future changes do not infer that disconnect removes it.

## Open questions

- None.
