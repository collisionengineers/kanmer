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

## Independent review — NEEDS-CHANGES — 37bc2265df46f609d1ddcd94ddf020e5a74941a2

Reviewer: codex-core071-review. Exact reviewed head: 37bc2265df46f609d1ddcd94ddf020e5a74941a2 (PR #192), base e966509c729194916d24194a87257cc1d39f308b.

Scope: compare-and-retry preservation for board-worktree .gitignore edits, including the inherited CORE-058 ignore reconciliation.

Focused rail: PASS — npm run test -w @kanmer/gui -- --run src/main/kanmerGit.test.ts, exit 0, 25/25 tests. PR checks report none.

Blocking P1 (GitHub thread 3836395258, current head): ensureIgnore still has a TOCTOU window for existing files. It reads current and confirms it equals before, then calls writeFile; another writer can change the file between that read and write. The write can overwrite that concurrent edit, and the immediate post-write read sees desired, so the function returns without retrying. The deterministic text test composes two sequential snapshots and does not exercise this interleaving. The implementation needs an actual serialized/atomic stale-base update (or a documented OS-level lock with deterministic coverage), not a compare-before-write that can still lose the exact concurrent edit it claims to preserve.

Disposition: NEEDS-CHANGES; do not merge PR #192 or move CORE-071.

# Fresh cumulative independent review — NEEDS-CHANGES

- Reviewer: codex-mcp-client; independent of CORE-071 author and CORE-074 author.
- Exact PR: #192 https://github.com/collisionengineers/kanmer/pull/192
- Exact cumulative head: `c8ee9a4e96c5e9d0268e21c59247db00ed958b0b`
- Base: `core-058-board-ignore-plugin-artifact` at `e966509c729194916d24194a87257cc1d39f308b`.
- PR state: OPEN, CLEAN, MERGEABLE; no hosted checks attached.
- The full net diff against CORE-058 is the append-only CORE-074 implementation in `apps/gui/src/main/kanmerGit.ts` and `kanmerGit.test.ts`; the prior TOCTOU compare/write code is no longer present. Current PR comment 3836395258 is addressed by the merged child.

## Evidence

- CORE-074 exact tree evidence at child head `59e7e0feaf4968b05d3d17df35052c20b6d900cf` (merged into this exact cumulative head): GUI Git 25/25, GUI typecheck PASS, diff check PASS; static symlink refusal and append-only ordering regressions pass.
- CORE-071's report records the earlier 25/25 compare/retry rail, but it is stale relative to the final append-only implementation; hosted Windows GUI remains INCONCLUSIVE.

## Blocking packet/traceability finding

CORE-075 is filed and blocks CORE-071. The CORE-071 research, plan, checklist, and post-implementation-report still describe the superseded compare-and-retry/read-before-write design and do not describe `O_APPEND`, `ignoreEntriesToAppend`, or the child merge. CORE-071 item traceability still records only `37bc2265` / PR 192 and omits CORE-074 commit `59e7e0feaf4968b05d3d17df35052c20b6d900cf`, merge head `c8ee9a4e96c5e9d0268e21c59247db00ed958b0b`, and PR 193. Refresh the packet and reachable commit/PR records before merge.

## Verdict

NEEDS-CHANGES. Do not merge PR #192 until CORE-075 refreshes the cumulative packet and traceability, then obtain a fresh review.
