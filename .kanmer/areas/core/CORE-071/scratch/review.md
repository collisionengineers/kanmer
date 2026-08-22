# Independent review — NEEDS-CHANGES

- Reviewer: codex-mcp-client; independent of author `codex-recovery`.
- Exact PR: #192 https://github.com/collisionengineers/kanmer/pull/192
- Exact head: `37bc2265df46f609d1ddcd94ddf020e5a74941a2`
- Base: `core-058-board-ignore-plugin-artifact` at `e966509c729194916d24194a87257cc1d39f308b` (includes CORE-069 and CORE-070 merges).
- PR state: OPEN, CLEAN, MERGEABLE; no hosted checks attached.
- Ticket packet and HZN-007 context read; the report/checklist match the bounded two-file diff. Recorded `37bc2265` resolves to the exact head.

## Diff and evidence

The change extracts `reconcileIgnoreText`, rereads the ignore file before writing, retries on observed content changes, verifies the post-write content, and uses exclusive creation for a new file. The focused real-Git rail passed independently: `npm test -w @kanmer/gui -- --run src/main/kanmerGit.test.ts` — 25/25 in 66.76s. The packet reports GUI typecheck, core build, scripts 88/88, and diff check passing; hosted Windows GUI remains INCONCLUSIVE.

## Blocking finding

CORE-074 — the existing-file path is still not atomic. After the second `readFile(file)` confirms `current === before`, the code calls ordinary `writeFile(file, desired)`. A concurrent human/process edit between that compare and the write is overwritten. The subsequent read-back only detects an edit that occurs after the write; it cannot detect content that was changed and then lost before the write. The new unit regression composes two sequential strings and does not exercise this write-window race. CORE-074 is filed in the Core area, linked to and blocking CORE-071.

## Verdict

NEEDS-CHANGES. Do not merge PR #192 until CORE-074's atomic compare-and-swap/locking or equivalent race-safe merge is implemented and independently reviewed.
