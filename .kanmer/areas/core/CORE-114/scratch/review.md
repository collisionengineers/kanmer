---
kind: review-attestation
pr: "291"
head_sha: "e2bb6ed895a9e3074a3d9521113ac64d153cbecc"
verdict: needs-changes
reviewer: "claude-core114-independent-reviewer"
independent: true
plan_hash: "07d6ef79454ca753"
ticket_updated: "2026-08-27T18:13:31.044Z"
board_sha: "9a84a789528462b6056c8019624c640024d39cfe"
threads_snapshot:
  reviews: 0
  comments: 0
  review_threads: 0
  unresolved_threads: 0
  gathered_head: "e2bb6ed895a9e3074a3d9521113ac64d153cbecc"
findings:
  - id: F-001
    severity: major
    summary: "Identity allocation is read-then-rename, not exclusive: concurrent first writes on a legacy board allocate N identities (last writer wins) and log N `board/project_id` activity entries"
    disposition: open
  - id: F-002
    severity: minor
    summary: "migrate_board dry_run over MCP allocates project.json via the write() wrapper's lazy ensureInit; tool description promises 'without writing' and `identity.wouldAllocate: true` is unreachable over MCP"
    disposition: open
  - id: F-003
    severity: minor
    summary: "get_status.project.location.remoteOrigin reports the raw remote.origin.url; embedded userinfo (user:token@) would be exposed in the result and hashed into kanmer-loc-v1"
    disposition: open
  - id: F-004
    severity: minor
    summary: "take_ticket release/renew/transfer ignore expected_revision (only the take action forwards it) although the schema offers it on the tool"
    disposition: open
  - id: F-005
    severity: note
    summary: "lastProject is refreshed only by writes/get_status/get_execution_packet; read-only results can report a stale project block after another process allocates or deletes project.json"
    disposition: accepted-risk
    reason: "One process serves one project; a stale read block is informational and corrected on the next write or get_status. Re-resolution per endpoint is MCP-054 scope (report already names it)."
  - id: F-006
    severity: note
    summary: "A deleted or malformed project.json is silently re-allocated as a new `migrated` uuid on the next write"
    disposition: accepted-risk
    reason: "The re-allocation records migratedFrom.fingerprint and a board/project_id activity entry, which is the auditable fallback FRD-029 asks for; documented in AGENTS.md gotcha 15. Distinguishing malformed from absent is a hardening follow-up, not a contract gap."
  - id: F-007
    severity: note
    summary: "kanmer-gate on run 33102297186 is red only because it ran before the board push (remote board now 9a84a789 with CORE-114 in review); controller re-run pending"
    disposition: accepted-risk
    reason: "Stale-board artefact, not a code defect; merge is withheld regardless because F-001 is open."
---

# Review — CORE-114 (PR #291 @ e2bb6ed8)

Independent reviewer; the implementer ran as client `claude-code`. Reviewed the full diff (18 files, +1231/-163) against FRD-029, PRD-002 req 2, ADR-0021, the plan (07d6ef79454ca753) and the post-implementation report.

## Changes reviewed

Core: `project.ts` (record, allocation, `computeRevision`), `store.ts` (`init` origin decision, `ensureProject` + activity entry, `getRevision`, `assertRevision` on update/move/take/setDoc/appendScratch), `migrate.ts` `migrateIdentity`, `links.ts` passthrough. Server: `resolveProject`/`lastProject`, `assertExpectedProject`, `ok`/`fail`/`guard` decoration, `expected_revision` on 7 tools, `get_status.project` + `compat`, `get_item.revision`, packet `project_id`/`ticket.revision`, `resolveLocation` (`kanmer-loc-v1`). Smoke +17 checks; protocol smoke; docs (tool-reference, kanmer-execute, AGENTS.md §4 + gotcha 15); regenerated bundle.

## Acceptance checks (independent, cwd `.worktrees/core-114`)

| Command | Result |
| --- | --- |
| `npm test -w @kanmer/core` | 19 files, 392 passed, exit 0 |
| `node packages/mcp-server/src/smoke.mjs` | 274/274, exit 0 |
| `npm run smoke:protocol` | 50/50, exit 0 |
| `npm run plugin:check` | plugin-sync OK, 38 tools, bundle bytes match, exit 0 |
| `npm run test:http` (root) | **Missing script** — host quirk: the script lives in the workspace; `npm run test:http -w @kanmer/mcp-server` → 118 pass / 0 fail, exit 0 |
| v0.3.12 compat (ad hoc): candidate bundle writes board + proof → installed `resources/mcp/kanmer-mcp.cjs` v0.3.12 `get_status`/`get_item`/`update_item`/`migrate_board` | all ok; `project.json` bytes untouched; candidate re-reads the same `project_id` |
| Concurrency probe (ad hoc, core dist): 6 parallel `store.init({fallbackFingerprint})` on a legacy board | **6 allocations, 6 `project_id` activity entries, one surviving uuid** → F-001 |

Checks at e2bb6ed8: `verify` in progress; `kanmer-gate` FAILURE (stale board, F-007); `regate` skipped. No reviews, comments or review threads.

## What is right

- WRONG_PROJECT ordering (index.ts `write()` → `assertExpectedProject` before `store.setActor`/`ensureInit`; same helper in `dispatch_task`/`cancel_dispatch`); accepts `project_id` or legacy fingerprint; a guessed id on an unassigned board is refused (`expectedProjectMatches`). `kanmer-proj-v1` bytes untouched.
- `expected_revision` CAS placement: `updateItem` after `expectedUpdated`, before the backward-move/gate writes; `assertMoveAllowed` before `computeOrder`'s sibling rewrite; `takeTicket` before any write; `setDoc` before `ensureDir`; `appendScratch` before the append; `link_doc`/`link_items` via `updateItem`. Smoke proves a stale token leaves the ticket folder snapshot byte-identical. The ticket text is part of the digest, so any `updated` change also moves the revision — `expected_updated` stays consistent with it. A proof rewrite changes `revision` without touching `updated` (F-015 closed). Scratch/reference excluded per the recorded decision.
- `structuredContent.project` on reads, writes and errors; the smoke deviation (`plan.structuredContent === undefined` → `error === undefined && project present`) preserves the "unclassified error has no code" intent.
- No mutating schema exposes a path property; root fixed at boot. Docs and bundle consistent; tool count 38.

## Findings and dispositions

- **F-001 (major, open)** — `packages/core/src/project.ts:93-111` `allocateProjectRecord` does `readProjectRecord` then `writeFileAtomic` (temp + rename, last writer wins); `store.ts` `ensureProject` then appends an activity entry for every caller that believed it allocated. Two servers (or a server and a candidate GUI) taking their first write on the same legacy board at once each mint a uuid, each return a different `project_id` to their client, and the activity log records N allocations for one board — violating the FRD-029 "one-time identity migration with an auditable fallback" edge case for the shared contract every HZN-008 ticket binds to. `io.ts` already has `writeFileExclusive` (EEXIST-safe). Fix: allocate with `writeFileExclusive`, on EEXIST re-read and return `allocated: false`; add a core test with two concurrent `init` calls asserting one activity entry and one id.
- **F-002 (minor, open)** — `index.ts` `migrate_board` is wrapped by `write()`, whose `ensureInit()` runs `store.init()` → `ensureProject` before the handler, so `dry_run: true` on a legacy board writes `project.json` and an activity entry; the description says "without writing" and `wouldAllocate: true` can never be observed over MCP (smoke documents the ordering instead). Either skip `ensureInit` when `dry_run` or reword the description.
- **F-003 (minor, open)** — `index.ts` `resolveLocation` reports `git config --get remote.origin.url` verbatim. A URL with embedded credentials would surface in `get_status` and be hashed into the location fingerprint. Strip userinfo before reporting/hashing. Absolute paths and hostname are new exposure but consistent with the pre-existing `boardRoot`/`repoRoot` fields.
- **F-004 (minor, open)** — `take_ticket` accepts `expected_revision` but only the `take` path forwards it; `release`/`renew`/`transfer` silently ignore it.
- F-005, F-006, F-007 — accepted risks as stated in frontmatter.

## Verdict

`needs-changes`. F-001 is a major on the identity allocation primitive and must be fixed in this PR before merge. Not merged; ticket stays in Review. Once F-001 (and ideally F-002–F-004) land, a fresh gather and replacement attestation at the new head are required, plus green `verify` and `kanmer-gate` at that head.

## Residual risk

With F-001 fixed, remaining risk is F-005 staleness of read-side `project` blocks and the documented uuid rotation on `project.json` deletion; both are informational and recorded in AGENTS.md.
