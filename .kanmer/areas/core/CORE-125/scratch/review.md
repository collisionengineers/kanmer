---
kind: review-attestation
pr: "296"
head_sha: "437772d47c47d9ccd5bdaedf818976b287ba6f4e"
verdict: pass
reviewer: "claude-core125-independent-reviewer"
independent: true
plan_hash: "c18d1eb2dfcc497f"
ticket_updated: "2026-08-27T22:53:19.960Z"
board_sha: "56ddbe6c504027db0ca9b8b7235dd36d1a466ea0"
expected_reviewers:
  - "claude-core125-independent-reviewer"
attestation_version: 1
threads_snapshot:
  - id: PRRT_kwDOT2PEds6dATwL
    author: chatgpt-codex-connector
    path: packages/core/src/store.ts
    line: 1766
    finding: F-001
    resolved: true
  - id: PRRT_kwDOT2PEds6dATwP
    author: chatgpt-codex-connector
    path: packages/core/src/store.ts
    line: 1143
    finding: F-002
    resolved: true
findings:
  - id: F-001
    severity: minor
    summary: "Acquisition times out instead of waiting for a live holder. Before this PR updateItem/setDoc/appendScratch took no lock and could never fail on contention; now a holder exceeding the retry budget makes a competing writer throw EEXIST. Verified DEFAULT_LOCK_RETRY_MS = [10,25,60,150,300,600,1000] over 8 attempts = ~2.145 s (io.ts:74) and DEFAULT_LOCK_STALE_MS = 30_000 (io.ts:73). Also: the lock is not FIFO, so during computeOrder's N sequential lock cycles on a large column a competing writer could in principle starve. Codex thread PRRT_kwDOT2PEds6dATwL."
    disposition: accepted-risk
    reason: "Measured hold is 6-17 ms/updateItem against a 2.145 s budget (~125x headroom); the section (store.ts:804-897) contains only file-local reads, the CAS, the gate and the write - no column materialisation, no network, no git. moveItem deliberately keeps assertMoveAllowed and computeOrder outside the lock (store.ts:917-930), so the one column-wide operation is never a long hold. The failure mode is a loud retryable error rather than the silent lease/claim reversion this ticket removes - a strict improvement in safety ordering. Wait-for-live-holder acquisition or batched computeOrder materialisation is the right follow-up; neither is in this bounded packet."
  - id: F-002
    severity: minor
    summary: "The board watcher does not ignore lock artifacts, so every ordinary write now adds watcher/IPC events. watchKanmer ignores only atomic-write temp files (watch.ts:25); App.tsx:502 increments changeSignal BEFORE classifyKanmerPath at :503; changeSignal is a dependency of the git-status effect at App.tsx:324, which spawns getKanmerGitStatus (a git subprocess), and is passed to three child components (:1558/:1613/:1632). Up to four extra events per write (lock + uuid-named owner marker, add and unlink); markers do not coalesce across operations within the 120 ms debounce. The ticket's research note understated this as 'IPC noise only'. Codex thread PRRT_kwDOT2PEds6dATwP."
    disposition: accepted-risk
    reason: "Redundant refetching in a local desktop app, not a correctness or data-integrity defect; the lock artifacts already existed for the four lease verbs before this PR. apps/gui/** is explicitly excluded from this ticket (another lane holds that worktree) and watch.ts is not in the plan's Expected-files table, so fixing either here would be unreviewed scope creep on the programme's most safety-critical change. Recommended follow-up: extend the ignored pattern at watch.ts:25 to cover *.lock, *.lock.owner-* and *.lock.stale-*."
  - id: F-003
    severity: minor
    summary: "deleteItem remains the only unlocked ticket-file mutation: fs.rm(loc.dir, {recursive:true, force:true}) at store.ts:1931 runs with no CAS and outside the write lock. It can now race a locked writer - a renewTicket/updateItem holding the lock can writeFileAtomic into a folder being removed (rename onto a deleted dir), or have its write silently discarded by the rm."
    disposition: accepted-risk
    reason: "Pre-existing and not regressed: before this PR every writer was unlocked, so delete raced all of them; it now races strictly fewer paths. Explicitly out of scope in the approved plan ('Out of scope: deleteItem') and files document, which record that locking the whole verb would hold the board lock across its N link-cleanup updateItem calls. Its missing CAS is an independent defect that deserves its own ticket and review; the post-implementation report already flags it as a follow-up."
  - id: F-004
    severity: note
    summary: "The AsyncLocalStorage re-entrancy guard is enforced by convention only. heldWriteLocks (store.ts:139) is consulted at store.ts:1139; a promise created inside a locked section but awaited outside it would inherit the 'held' set and silently skip locking, defeating the exclusion this ticket establishes. The doc comment (store.ts:1121-1136) records the constraint but nothing enforces it - there is no defensive assertion on the short-circuit path."
    disposition: accepted-risk
    reason: "Verified no such call exists today: grep over packages/core/src/store.ts finds no 'void ', no '.then(', no '.catch(', no setTimeout/setInterval/queueMicrotask/process.nextTick, and every internal write is awaited. The hazard is latent and future-facing, not present. Cheap hardening for a follow-up: assert on the short-circuit path that the lock file actually exists before running work directly, which would turn an escaped-context bug into an immediate failure instead of silent loss of exclusion."
  - id: F-005
    severity: note
    summary: "kanmer-gate initially failed WRONG_STAGE at head 437772d4 because it read the board tip before the move to Review had landed - the same stale-board pattern as CORE-115 F-003 and CORE-124 F-004."
    disposition: fixed
    reason: "Run 33124151447 at 437772d4 re-ran the gate once the board was pushed: kanmer-gate SUCCESS (job 98699636982, completed 2026-08-27T23:00:32Z) and verify SUCCESS (job 98699637828, completed 22:57:06Z); regate skipped (not required). Run conclusion: success. No reviewer re-run was needed."
---

# Independent review — CORE-125 / PR #296 (head 437772d4)

Reviewer `claude-core125-independent-reviewer`; implementer `claude-code-core125`
(a different agent), so `independent: true` is truthful. Reviewed read-only in
`.worktrees/core-125`; the board worktree `.worktrees/kanmer` was never checked
out, switched or written, and `.worktrees/core-118` was not touched.

## Verdict: pass

No blocker and no major finding. Both required checks are green at the reviewed
head, both Codex threads are replied to with their finding id and resolved, and
the failing-first proof was independently reproduced.

## What the change does

`.kanmer/leases.lock` becomes the board-wide **write** lock rather than the
lease verbs' private one. Ignoring re-indentation the store diff is +56/−1
(`git diff -w`), and it is exactly three things:

1. A module-level `AsyncLocalStorage<ReadonlySet<string>>` of held lock-file
   paths (`store.ts:139`) makes `withLeaseLock` re-entrant **within one async
   execution context** (`store.ts:1137-1144`): a nested acquire of a path this
   context already holds runs the work directly; anything else takes the file
   lock and establishes the context inside it.
2. `updateItem` (`store.ts:804`), `setDoc` (`:1766`) and `appendScratch`
   (`:2233`) run their locate → read → CAS → write inside that lock.
3. `moveItem` (`:917-930`) deliberately takes no outer lock.

## 1. Re-entrancy and deadlock — walked, no missed path

Every nested path in the brief was traced in the current file:

- `updateItem` → `appendTransition` (`:887`) → `setDoc` (`:1766`) — re-enters.
- `renewTicket` (lock `:1568`) → `appendTransition` (`:1642`) → `setDoc`; and
  `transferTicket` (lock `:1469`) → `appendTransition` (`:1541`) → `setDoc`.
- `moveItem` → `computeOrder` → per-sibling `updateItem`, then the final
  `updateItem` — each a separate acquire/release, no nesting at the outer level.
- `deleteItem` → `updateItem` (link cleanup) — `deleteItem` holds no lock, so
  each cleanup acquires cleanly.
- `takeTicket` sibling batch stamps (`:1407`) are inside its own lock (`:1317`).
- Batch/reconciliation: `grep -n "econcil" packages/core/src/store.ts` returns
  nothing — core has no reconciliation write path, so there is none to miss.

I found **no missed path**. Two additional checks the packet did not claim:

- **No lock-order inversion (ABBA).** The other lock in the store is
  `${boardFile}.lock`, taken only by `setBoard` (`:384`) and `updateBoard`
  (`:396`). Nothing inside a `leases.lock` section calls either — `getBoard()`
  (`:367`) is a plain read, including the two calls inside locked sections
  (`:790` is pre-lock, `:838` is a read inside it). Conversely nothing inside a
  board-lock section takes `leases.lock`: `assertNoStrandedColumns` only calls
  `listItems`, and the sole `updateBoard` caller in the repo
  (`packages/mcp-server/src/index.ts:1274`) mutates `board.sources` only. No
  cycle exists.
- **Cross-instance and cross-process exclusion is intact.** The guard is keyed
  by absolute lock-file path and the context set is rebuilt per acquire
  (`new Set(held ?? [])`), so two `KanmerStore` instances on one board still
  exclude each other through the file lock — test 2 below proves exactly that
  interleaving across two instances — and two stores on *different* boards never
  alias. A second process is unaffected: the ALS store is per-process and empty
  for every fresh caller.

**Failure mode of the guard.** Probed as asked, and it is safe today but by
convention only — recorded as F-004. See that finding for the grep evidence and
the suggested defensive assertion.

## 2. Correctness of the critical section

`updateItem` (`store.ts:804-897`): the lock opens immediately after argument
validation and closes after the return value is computed. Inside, in order:
`locateItem` → `readText` → `expectedUpdated` conflict check → `assertRevision`
→ `backwardMoveEffects` → no-op early return → `assertDocGate` (`:838-839`) →
`stageEntered` stamp → area-folder `fs.rename` (`:860`) → `writeFileAtomic`
(`:864`) → `appendActivity` → backward-move activity + `appendTransition`. The
re-read is inside. Everything the brief required to be inside is inside.
Outside are only `getBoard`, `assertStage`, `assertFieldAgainstBoard`,
`assertProfileAgainstBoard`, `assertGroups`, `assertRefs` — none touches a
ticket file. Ordering, error strings, the no-op early return and the return
value are unchanged.

`moveItem` — **the trade-off is sound.** `assertMoveAllowed` and `computeOrder`
stay outside. Holding a board-wide lock across `computeOrder` would serialise
every writer for the length of a whole-column materialisation, which on a large
column would exceed the lock's own ~2.145 s retry budget and convert contention
into errors — worse than the TOCTOU it would close. The remaining window is
between the `assertMoveAllowed` pre-check and the final locked `updateItem`.
**The final in-lock re-read does close it for this ticket's obligation**: the
moved ticket's CAS and write are atomic against a lease write, which is the
property CORE-115 F-001 and FRD-030 owe. What it does *not* close is the
pre-check itself — a gate decision could in principle be invalidated between
`assertMoveAllowed` and the write. That is not a new window (it exists on main
identically) and `updateItem` re-evaluates `assertDocGate` under the lock before
writing, so a stale pre-check cannot produce an ungated write. Judged
acceptable and correctly reasoned in the code comment at `:920-930`.

`setDoc` / `appendScratch` — **CAS semantics from CORE-114 are unchanged.**
Both keep the identical sequence and simply move it inside the lock: the
document-inclusive `revision` (`rev1:…`) is still computed on read inside
`assertRevision`, the per-document `expectedVersion` check is unchanged, and
`contentVersion(text)` is still the returned version. Locking narrows the window
between the check and the write; it changes no value, no error string and no
ordering. `src/project.test.ts`'s document-inclusive-revision case (including
the F-015 "changes when a proof is rewritten even though `updated` does not"
assertion) passes unchanged.

## 3. Lock duration and liveness — numbers check out

The report's constants are correct against the source:
`DEFAULT_LOCK_RETRY_MS = [10, 25, 60, 150, 300, 600, 1_000]` (`io.ts:74`) summing
to **2 145 ms** across the `attempt <= delays.length` loop (8 attempts), and
`DEFAULT_LOCK_STALE_MS = 30_000` (`io.ts:73`). The measured 6–17 ms hold leaves
roughly 125x headroom.

**Can a slow or crashed holder wedge the GUI?** A *crashed* holder cannot: the
30 s stale window plus owner-marker liveness (`hasActiveOwnerMarker`, checked on
every claim attempt) reclaims it, and the marker records `pid` and `identity` so
a dead owner is detected rather than waited on indefinitely. A *slow* holder
can make a concurrent write fail with `EEXIST` after ~2.145 s — that is real and
newly reachable from ordinary edits, recorded as F-001. The GUI writes one store
call per IPC handler on the main process, so a tight section cannot stall the
UI, and the reclaim path does fire.

## 4. The failing-first proof — independently reproduced

I did not take the report's word for this. In `.worktrees/core-125` I replaced
`packages/core/src/store.ts` with `git show f3060b06:packages/core/src/store.ts`
(the pre-change file, tests untouched) and ran
`npx vitest run src/claims.test.ts -t "CORE-125"`. Result, **exit 1**:

```
× loses neither the lease record nor a concurrent updateItem from another store
  → expected 'A' to be 'edited during the renewal'        (claims.test.ts:597)
× keeps a lease renewal that lands mid-updateItem: the stale writer never reverts the lease record
  → expected 1 to be 2                                    (claims.test.ts:635)
Tests  2 failed | 1 passed | 45 skipped (48)
```

Both assertions match the report verbatim. The store file was then restored
byte-identically (`git status --short` clean). The third test passes against
pre-change code, which is honest and expected — it is a regression guard for the
new guard (nested paths must not deadlock), not a failing-first proof, and the
report describes it that way.

**The tests park mid-critical-section using real public verbs, as claimed.**
Test 1 wraps the public `getBoard` on one `KanmerStore` instance; `renewTicket`
awaits it at `store.ts:1608` *inside* its lock, after its read and before its
write. Test 2 wraps the public `getDoc` on one instance; the audited
Review → Implementing return reads the attestation through it inside
`updateItem`'s locked section, after the ticket read and before the write. Both
are instance-level wrappers of public methods — **no source seam, no module
mocking, no injected test hook in production code**. Test 2 additionally proves
cross-instance exclusion, since the renewal runs on a second store and must
block on the file lock. Test 3 walks `moveItem`→`computeOrder`→`updateItem`,
`updateItem`→`appendTransition`→`setDoc` and lease-verb→`setDoc`, and asserts no
`leases.lock` residue.

## 5. Scope and regressions

- **CORE-124 F-001 is genuinely fixed.** The first-member sibling stamps are
  written at `store.ts:1407` inside `takeTicket`'s lock (`:1317`); with
  `updateItem` now sharing that lock, a racing ordinary write can no longer drop
  a sibling's `lease_batch`/`lease_batch_frozen_at`. The deferral recorded in
  CORE-124's attestation is discharged.
- **`deleteItem` still has no CAS** — recorded as F-003 (minor, accepted-risk):
  pre-existing, explicitly out of scope in the approved plan, not regressed.
- **Accepted-risk lists not regressed.** CORE-115 F-004, F-006, F-007, F-008,
  F-009, F-010, F-011, F-012, F-014, F-015, F-016 and CORE-124 F-002, F-003,
  F-005, F-006, F-007, F-008, F-009, F-010 are all lease/batch *behaviour* or
  skill prose. This diff adds only a lock wrapper and changes no lease
  semantics, no error string and no tool description, so none of them moved.
  CORE-115 F-007 (the six-store renewal test's dependence on the retry schedule)
  is the one with raised exposure under more contention; it passed locally and
  on the hosted runner.
- **Bounded packet respected.** Exactly four files: `AGENTS.md`,
  `packages/core/src/store.ts`, `packages/core/src/claims.test.ts`,
  `plugins/kanmer/mcp/kanmer-mcp.cjs`. No `apps/gui` file. No dependency added
  (`git diff --stat` over `package.json`/`package-lock.json` is empty;
  `node:async_hooks` is a builtin). No test weakened —
  `git diff --numstat` on `claims.test.ts` is **118 additions, 0 deletions**.
  The bundle rebuild is deviation 2 in the report and matches the
  CORE-115/CORE-124 precedent. AGENTS.md §8 gotcha 17 is retitled "every ticket
  write goes through one lock" and correctly states what is inside the lock, the
  context-scoped re-entrancy and why `computeOrder` is outside.
- The browser entry gained no Node import: `scripts/check-browser.mjs` runs in
  `npm run build`, which exited 0.

## Independent rail (cwd `.worktrees/core-125`, head 437772d4)

| Command | Exit | Result |
|---|---|---|
| `npm run build` | 0 | core + mcp-server, `check-browser` clean |
| `npm run typecheck` | 0 | all workspaces (after build) |
| `npm test -w @kanmer/core` | 0 | **19 files, 420 tests**, 72.93 s |
| `node packages/mcp-server/src/smoke.mjs` | 0 | **306/306** |
| `npm run smoke:protocol` | 0 | **50/50** |
| `npm run plugin:check` | 0 | **39 tools match, bundle bytes match**, isolated handshake 39 |

Every expected count reproduced exactly. `npm run verify` was not re-run
locally: the report's only local failure is the known
`scripts/antigravity-plugin-config.test.mjs` EBUSY pair, and the hosted `verify`
is authoritative and green. Host quirks recorded for this session: none
encountered — no antigravity EBUSY (that suite was not invoked), no core 5 s
timeouts, no http/tunnel spawn ETIMEDOUT. The worktree was left clean.

## Required checks at 437772d4

Branch protection requires `verify` and `kanmer-gate` with conversation
resolution. Run **33124151447**, conclusion `success`:

- `verify` — **SUCCESS** (job 98699637828, 22:52:00→22:57:06Z)
- `kanmer-gate` — **SUCCESS** (job 98699636982, 22:59:31→23:00:32Z), green after
  the board tip landed; the earlier `WRONG_STAGE` is F-005.
- `regate` — skipped, not required.

## Review threads

Two threads, both from `chatgpt-codex-connector` at this head, both previously
undispositioned. A GitHub bot is never a gate: each was assessed independently
against the source before disposition, and F-002 was **confirmed more severe
than the ticket's own research note claimed**. Each received a reply naming its
finding id and disposition and was then resolved:
`PRRT_kwDOT2PEds6dATwL` → F-001, `PRRT_kwDOT2PEds6dATwP` → F-002. None was
silently dropped. No blocker or major remains open.

## Residual risk

The board now has a single global write lock, so throughput is bounded by it and
every write costs ~11 ms more. The two structural follow-ups are F-001
(wait-for-live-holder acquisition or batched `computeOrder` materialisation, to
remove the starvation and timeout edge) and F-003 (`deleteItem`'s missing CAS,
the last unlocked ticket-file mutation). F-002 is a GUI refresh-amplification
fix belonging to the `apps/gui`/`watch.ts` lane. F-004 asks for one defensive
assertion so the re-entrancy guard stops depending on convention. None blocks
this merge; all four are worth a follow-up ticket.
