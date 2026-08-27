## Research notes — CORE-125 (2026-08-27, base 9c9a6980)

Question: can every non-lease ticket-file writer be serialised against `.kanmer/leases.lock` without deadlock or a long board-wide hold?

**Unlocked read → CAS → write paths (packages/core/src/store.ts @ 9c9a6980)**
- `updateItem` (:771) — `locateItem` → `readText` → `expectedUpdated`/`assertRevision` CAS → `backwardMoveEffects` (CORE-121 claim_controller/review_round rewrite) → `assertDocGate` → optional folder rename → `writeFileAtomic` (:850). No lock.
- `moveItem` (:888) — `assertMoveAllowed` (:998, pre-checks) → `computeOrder` (:1045, materialises `order` on the whole target column via nested `updateItem`) → `updateItem`. No lock.
- `setDoc` (:1711) — `assertRevision` → per-document `expectedVersion` → `writeFileAtomic`. Writes a document, never the ticket file, so it cannot clobber a lease record directly; its revision CAS is nevertheless evaluated outside any critical section.
- `appendScratch` (:2174) — `assertRevision` → `fs.appendFile`. Same.
- `deleteItem` (:1876) — `fs.rm` with no CAS at all, then N nested `updateItem` link cleanups.
- `createItem` (:670) — `writeFileExclusive` on a fresh path; allocation race already handled, no read-modify-write, so out of scope.
- Lease verbs `takeTicket` (:1262) / `releaseTicket` (:1377) / `transferTicket` (:1423) / `renewTicket` (:1518) already run inside `withLeaseLock` (:1097) and re-read inside it.

**Re-entrancy map (the deadlock hazard)**
- `updateItem` → `appendTransition` (:872) → `setDoc` (:984).
- `transferTicket` (:1496) and `renewTicket` (:1597) call `appendTransition` → `setDoc` **while already holding the lease lock**.
- `moveItem` → `computeOrder` → `updateItem` per sibling (:1055), and → `updateItem` (:906).
- `deleteItem` → `updateItem` (:1897).
`withExclusiveFileLock` is a cross-process exclusive-create lock with no re-entrancy: a nested acquire from the same process EEXISTs, cannot be recovered as stale (own pid is alive), retries ~2.1 s and then throws. So any naive nested acquire is a hard failure, not a slow path.

**Lock cost / duration budget (packages/core/src/io.ts)**
- `DEFAULT_LOCK_RETRY_MS = [10,25,60,150,300,600,1000]` (io.ts:74) → a competing acquirer gives up after ~2.145 s. Anything held longer than that turns contention into errors, so the critical section must stay in the low milliseconds.
- `DEFAULT_LOCK_STALE_MS = 30_000` (io.ts:73) + owner-marker liveness ⇒ a crashed holder is recovered after 30 s; a stale lock cannot wedge the GUI permanently.
- A lock cycle costs 2 exclusive writes (marker + lock), a marker scan and 2 removals. `computeOrder`'s column materialisation would pay that per sibling if the sibling writes are individually locked.

**Consequence for scope**: the lock must be board-wide (not per-ticket) because lease critical sections already span several tickets — `assertWorkspaceFree` scans every ticket and the CORE-124 first-member take stamps `lease_batch` on siblings (store.ts:1356-1363, CORE-124 review F-001). A per-ticket lock would not serialise a sibling's `updateItem` against that stamp.

**GUI impact**: `watchKanmer` (watch.ts:23) does not ignore `.lock`; `.kanmer/leases.lock` and its `leases.lock.owner-*` markers already produce add/unlink events today for lease verbs. `classifyKanmerPath` returns null for them, so `App.tsx onDiskChange` falls into the "nothing to re-render" branch. More frequent locking adds IPC noise only, no reload storm. The GUI writes through the same `KanmerStore` (apps/gui/src/main/index.ts:1156/1161/1335), one store call per IPC, so a tight section cannot stall the UI.

**Test seam for a deterministic failing-first test**: `renewTicket` calls the public `this.getBoard()` (:1563) *inside* its lease lock, after its read and before its write. Replacing `getBoard` on one `KanmerStore` instance with a barrier-awaiting wrapper pauses a real renewal inside its critical section, so a second store's `updateItem` can be proven to write into that window. No source seam and no module mocking is needed.

**Inherited context**: CORE-115 review F-001 (this ticket), F-004/F-008 accepted risk (do not regress). CORE-124 review F-001 (sibling batch stamps sit in the same unlocked window) is fixed by the same change. CORE-115 F-010/F-012/F-014/F-015/F-016 were flagged as "hardening candidates for CORE-125" but are separate behavioural changes, not serialisation; kept out of this bounded fix.
