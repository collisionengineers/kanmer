2026-08-21 merged-main verification: HEAD 1b5ae0d4546d1b57be393b38f4813f9ecfb6e7d5 contains d0f927a3f9aab7fa6f4716410138126f3ff1fc35. Focused IO/migration tests 28/28, full core 263/263, core typecheck and build passed. Real 242-ticket fixture and live Windows EPERM/antivirus lock run are unavailable and remain INCONCLUSIVE; ticket stays Verifying.

2026-08-22T00:09:07.715Z — Independent merged-main rerun at af61144ce743f74b2aba92fb0778588b0b9bedd0: focused IO/migration 28/28, full core 263/263, core typecheck, core build, and diff-check exited 0. The 242-ticket fixture and live Windows EPERM/file-lock run remain INCONCLUSIVE; CORE-022 stays Verifying.

2026-08-22T03:06:02.231Z — Fresh merged-main shared rail at 4f785781e7f1993fbcde5e474640db509737c0bd: npm run verify exited 0. Build, manual freshness, core 266/266, GUI 355/355, MCP HTTP 61/61, scripts 82/82, all-workspace typecheck, MCP smoke 224/224, mcpb/plugin parity, protocol 46/46, discovery 13/13, skills/AGENTS checks and diff-check all passed. This strengthens deterministic merged-main evidence only; ticket-specific real external acceptance remains unchanged and is not fabricated.

2026-08-22 verification started: read full CORE-022 ticket docs (research, files, plan, checklist, post-implementation-report, proof, scratch/execute, scratch/review, scratch/verify) and HZN-007/context.md. Item is Verifying with two explicitly unchecked real-board/Windows acceptance boxes; no Done move yet. Local main HEAD 241ff13e048e4535a69d7375b9f734d9a4606cf8 contains implementation d0f927a3f9aab7fa6f4716410138126f3ff1fc35 (merge-base exit 0); PR #28 is MERGED at dfc2b059aaab7f6dbaac5085c9a2b475c538cd09. origin/main currently advertises b6c8eb02, ahead of local; verification must account for this before claiming merged-main evidence.

2026-08-22 exact merged-origin rerun: fetched origin/main b6c8eb02a82d8180b965094c4956109d4646e60b in temporary detached worktree .worktrees/verify-core022-origin; implementation d0f927a3f9aab7fa6f4716410138126f3ff1fc35 reachable (merge-base exit 0), PR #28 MERGED at dfc2b059aaab7f6dbaac5085c9a2b475c538cd09. Focused IO/migration 28/28 exit 0; full core 13 files / 269 tests exit 0; core typecheck exit 0; core build (ESM/DTS/browser) exit 0; diff-check exit 0. Exact deterministic merged-main evidence passes. The real 242-ticket fixture and genuine Windows handle/antivirus EPERM run remain unavailable and INCONCLUSIVE. Existing failed attempts (headless ENOENT before build, root HTTP timeouts, linked-worktree plugin:check refusal) remain preserved in proof/report and are not erased. CORE-022 remains Verifying; no Done move or closeout/release.

Cleanup: temporary detached verification worktree .worktrees/verify-core022-origin was clean (git status --short empty) and removed with git worktree remove; no recorded CORE-022 ticket worktree or branch was present to release. Board item remains Verifying with taken=null. No CORE-024 files, docs, status, or worktree were touched.

## 2026-08-24 — isolated current-main verification evidence

Scope: fully disposable local fixture only; no user board, product source, proof, release, stage, merge, or Done mutation.

**Target and build**

- Detached clone target: `ef67c04e0f3a20145dcb88497fdcb97a53038ab6`.
- `git diff --quiet 7579341048f8d5952916dd7556bff0504f720eab ef67c04e0f3a20145dcb88497fdcb97a53038ab6 -- packages/core/src/io.ts packages/core/src/migrate.ts` exited **0** (the ticket’s core paths are unchanged across the intervening merge).
- `npm ci && npm run build:core` exited **0** in that detached clone.

**Real Kanmer-board migration fixture**

Command: `node migration-fixture.mjs` — exit **0**.

The fixture created a format-2 `.kanmer/` board with exactly 242 ticket folders: 48 format-2-shaped tickets (47 `todo`, one `backlog`) and 194 already-v3-shaped tickets, plus five stale atomic temp files older than five minutes. It used the built current-main `KanmerStore` and `migrateToV3`, not a mock or injected seam.

Exact stdout:

```json
{"fixtureContract":{"tickets":242,"migrated":48,"untouched":194,"remapped":47,"needsRestage":0,"staleTempsSwept":5,"staleTempsRemaining":0},"first":{"alreadyV3":false,"resumed":true,"stageMapping":[{"from":"todo","to":"backlog","count":47},{"from":"backlog","to":"backlog","count":1},{"from":"done","to":"done","count":194}],"notes":["This run resumed a previously interrupted migration — tickets already in their format-3 shape were left untouched rather than rewritten.","Removed 5 stale atomic-write temp file(s) left by an interrupted run."]},"second":{"alreadyV3":true,"stageMapping":[],"changedTicketFiles":0},"finalFormat":3}
```

Thus 48 ticket files changed, 194 were byte-identical, exactly 47 statuses remapped, no ticket required restaging, five stale temps were removed, format became 3, and a clean second run was an `alreadyV3` no-op with zero changed ticket files.

**Genuine Windows filesystem-lock contention**

Command: `node lock-fixture.mjs` — exit **0**.

A child Windows PowerShell process opened the disposable destination with real `.NET System.IO.FileStream` `FileAccess.Read` and `FileShare.Read` (no delete sharing), emitted `LOCKED`, held it for 120 ms, then disposed it and emitted `RELEASED`. While the handle was live, an unmocked `fs.promises.rename` replacement failed with `EPERM`. The fixture then called the built current-main `writeFileAtomic` directly; no source change, test seam, assertion weakening, or global timeout was involved.

Exact stdout:

```json
{"fileShare":"Read (no Delete sharing)","directRenameCode":"EPERM","atomicDurationMs":298,"holderExit":0,"holderSignals":["LOCKED","RELEASED"],"targetContents":"after\n","tempResidue":[]}
```

The 298 ms duration exceeds the held interval, the target was atomically replaced after release, and no temp residue remained. This is a PASS for a real transient Windows destination-lock/retry path.

**Disposition:** verification evidence PASS for the requested migration and real-lock checks on current main. This scratch note deliberately does not amend `proof.md`, checklist state, ticket stage, or release status; independent verification/closeout decides those separately.
