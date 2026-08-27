---
kind: review-attestation
pr: "295"
head_sha: "14cf7083d08eb406aa30361ddca6fcedc94af4f5"
verdict: pass
reviewer: "claude-core124-independent-reviewer"
independent: true
plan_hash: "0bb0de6498785de7"
ticket_updated: "2026-08-27T21:10:03.643Z"
board_sha: "2f3b832e16432ac209ff0c423694e5b39f9f29e1"
threads_snapshot:
  total: 6
  unresolved: 0
  github_thread_ids:
    - PRRT_kwDOT2PEds6c-2Za
    - PRRT_kwDOT2PEds6c-2Zf
    - PRRT_kwDOT2PEds6c-2Zj
    - PRRT_kwDOT2PEds6c-2Zn
    - PRRT_kwDOT2PEds6c-2Zs
    - PRRT_kwDOT2PEds6c-2Zw
attestation_version: 2
findings:
  - id: F-001
    severity: minor
    summary: "The first-member take stamps lease_batch/lease_batch_frozen_at on untaken siblings and bumps their `updated` (store.ts:1359-1363). Under the lease lock, but siblings remain exposed to the unlocked updateItem/moveItem window (CORE-115 F-001): a racing unlocked write can drop a sibling's membership — fail-safe for occupancy (WORKSPACE_OCCUPIED) but not for cleanup (BATCH_ACTIVE no longer counts it). expected_updated users of a sibling see REVISION_CONFLICT, the correct signal."
    disposition: deferred-to-ticket
    ticket: CORE-125
  - id: F-002
    severity: note
    summary: "A member deleted with delete_item mid-batch simply disappears from batchState (store.ts:1388-1390); archived members count as terminal. No refusal guards delete_item for a batch member."
    disposition: accepted-risk
    reason: "delete_item is an operator verb outside this ticket's bounded scope; archive is the documented retirement shape. Deletion cannot grant a stranger the workspace (it has no lease_batch)."
  - id: F-003
    severity: note
    summary: "BATCH_ACTIVE applies to never-taken siblings too: if the only taken member must abort, it cannot release until every untaken sibling is Done or archived (store.ts:1383-1395)."
    disposition: accepted-risk
    reason: "FRD-030's rule (cleanup waits for all members terminal); archive is the documented exit and the closeout prose names it."
  - id: F-004
    severity: note
    summary: "kanmer-gate attempt 1 of run 33116759466 failed WRONG_STAGE against board 8a6ca845 (pre-review board tip)."
    disposition: fixed
    reason: "Attempt 2 at the same head 14cf7083 against board tip 2f3b832e: verify SUCCESS, kanmer-gate SUCCESS; regate skipped (not required)."
  - id: F-005
    severity: minor
    summary: "Same-batch admission in assertWorkspaceFree (store.ts:1131-1141) checks batch id, worktree and branch only — never the incoming controller/assignee against the batch holder, though FRD-030 says one controller owns a batch workspace. Codex thread PRRT_kwDOT2PEds6c-2Za."
    disposition: deferred-to-ticket
    ticket: CORE-126
  - id: F-006
    severity: note
    summary: "releaseTicket excludes the releasing member from `pending`, so an in-flight member can release once its siblings are terminal (store.ts:1389). Codex thread PRRT_kwDOT2PEds6c-2Zf."
    disposition: rejected-with-reason
    reason: "release has never required the releasing ticket's own terminal state (isolated mode; CORE-115 F-010); the batch gate protects other members' claim on the shared workspace, and the remaining members are terminal by construction."
  - id: F-007
    severity: minor
    summary: "Sibling stamps are sequential per-file atomic writes; a crash mid-loop leaves a partial roster whose retry is BATCH_FROZEN with no repair path except manual frontmatter edits (store.ts:1359-1363). Codex thread PRRT_kwDOT2PEds6c-2Zj."
    disposition: deferred-to-ticket
    ticket: CORE-126
  - id: F-008
    severity: major
    summary: "kanmer-execute batch-lane prose prescribes one `Kanmer: <ID>` footer per member, but merge-gate.ts:144-146 refuses multiple distinct footers as ambiguous (NO_TICKET), so the prescribed batch PR cannot pass the required kanmer-gate. Codex thread PRRT_kwDOT2PEds6c-2Zn."
    disposition: deferred-to-ticket
    ticket: CORE-126
  - id: F-009
    severity: minor
    summary: "The declaring ticket is exempt from the already-taken check (store.ts:1221), so a force-retaken isolated ticket can declare a batch after its implementation started. Codex thread PRRT_kwDOT2PEds6c-2Zs."
    disposition: deferred-to-ticket
    ticket: CORE-126
  - id: F-010
    severity: minor
    summary: "kanmer-closeout prose tells the agent to find members via list_items, but summarise() (index.ts:383) omits lease_batch and archived members need include_archived. Codex thread PRRT_kwDOT2PEds6c-2Zw."
    disposition: deferred-to-ticket
    ticket: CORE-126
---

# Independent review — CORE-124 / PR #295 (head 14cf7083), attestation v2

Reviewer `claude-core124-independent-reviewer`; implementer `claude-code-core124` (different agent). Read-only in `.worktrees/core-124`; board worktree untouched. v2 replaces v1 after six Codex threads arrived at the same head; no code changed.

## Verdict: pass

## Scrutiny (file:line, worktree head 14cf7083)

1. **Fields.** `lease_batch` (`z.string().min(1).optional()`) and `lease_batch_frozen_at` (`TimestampSchema.optional()`) on the passthrough schema (`types.ts:477-478`); `KEY_ORDER` after `lease_reclaimed_from` (`frontmatter.ts:32-33`). Written only by `takeTicket` (`store.ts:1356-1363`, inside `withLeaseLock` entered at `:1272`) and cleared by `releaseTicket` via `clearLeaseFields` (`:1229-1230`, lock at `:1378`). `UpdateItemPatch`/`update_item` unchanged. Transfer/renew spread `current`, so membership survives; force retake keeps it (test asserts).
2. **Declaration.** `validateBatchDeclaration` (`store.ts:1195-1224`): < 2 distinct ids, taker absent, any existing member of the id → `BATCH_FROZEN`, unknown/archived/terminal/other-batch/taken member → `BATCH_INVALID`; all before any write (stamps at `:1356+`, after `assertWorkspaceFree`). Adding a member after freeze is impossible (`:1207`; a member-less `batch` → `BATCH_INVALID` at `:1309`). Two batches: `:1217`, `:1301`. Two active workspaces: `BATCH_WORKSPACE_MISMATCH` `:1131-1141`.
3. **Occupancy.** Same-batch branch requires normalised-worktree and exact-branch equality with the taken sibling; non-members fall through to `WORKSPACE_OCCUPIED` (`:1143-1152`, message names the batch); `force` is not consulted (call site `:1315` unchanged). Sibling `updated` bump → F-001.
4. **Release.** `BATCH_ACTIVE` while any other member is non-terminal (`:1384-1395`), before the write at `:1397`; the same `store.releaseTicket` serves the MCP release branch and the GUI. Last release clears both keys.
5. **Packet.** Only `unsafeTakenWorktree` excepts same-`lease_batch` siblings (`execution-packet.ts:327-329`); board/source/foreign/alias/detached/branch checks untouched. `claim.batch` from `store.batchState` (`:540-550`).
6. **Errors.** Four `BATCH_*:` prefixes → `LEASE_CONFLICT` (`errors.ts:8`); smoke asserts the code.
7. **Tests.** `claims.test.ts` batch suite: AC4 three members, one workspace, three attestations on one `pr`/`HEAD`, three proofs, `BATCH_ACTIVE` byte-identical, release order; AC5 `BATCH_FROZEN`, non-member `BATCH_INVALID`, `WORKSPACE_OCCUPIED` incl. force with snapshot equality; mismatch; invalid declarations; archived terminal; key-order round trip + v0.3.12 ticket untouched. Smoke +7 on a real worktree incl. packet ready on the shared worktree. No existing assertion changed.
8. **Docs/skills.** Additive prose in execute/closeout/auto; `verify:skills` green; AGENTS §4 example + gotcha 18; glossary + regenerated manual; bundle rebuilt (39 tools, bytes match). F-016 wording fixed. The execute/closeout prose gaps found by Codex are F-008/F-010 (CORE-126).

## Independent rail (cwd `.worktrees/core-124`)

`npm test -w @kanmer/core` 0 (19 files, 417); `node packages/mcp-server/src/smoke.mjs` 306/306; `npm run smoke:protocol` 50/50; `npm run typecheck` 0; `npm run plugin:check` 0 (39 tools match, bytes match, isolated handshake 39); `npm run verify:skills` ALL CHECKS PASSED.

## Required checks

Branch protection requires `verify` and `kanmer-gate` with conversation resolution. Run 33116759466 attempt 2 at 14cf7083: `verify` SUCCESS, `kanmer-gate` SUCCESS; `regate` skipped. Attempt 1 gate failure was the stale-board WRONG_STAGE (F-004).

## Review threads

Six Codex threads at 14cf7083, each replied to with its finding id and disposition and resolved: F-005, F-006, F-007, F-008, F-009, F-010. Bots are never a gate; each was assessed independently (F-008 and F-010 confirmed against `merge-gate.ts` and `index.ts summarise`). No blocker or major remains open: F-008 (major) is deferred to CORE-126, which was outside CORE-124's bounded packet (merge-gate.ts not an expected file) and does not affect the isolated flow.

## Residual risk

F-008 means the batch flow is complete in core but not yet passable through the hosted merge gate until CORE-126 lands; F-001 sits in the CORE-125 unlocked-writer window. Batch-wide transfer semantics remain parked to SKILL-036.
