# Plan — CORE-132: Serialize releases with release-channel leases and immutable candidate identity

## Objective

One renewable lease owns a release channel at a time; a release attempt is an
immutable-identity record with its own candidate identity; reconciliation
observes real release evidence instead of reporting `not-applicable`; and
`dispatch_task`'s verification prompt names the ticket's real verification
target.

## Starting state

Verified at `origin/main` `70d23efd` (see `research/research.md` for the full
read).

- **CORE-116 shipped the first half of FRD-031** at `28a12643`:
  `resolveDelivery` / `deliveryPolicySource` / `deliveryTargets` in
  `packages/core/src/board.ts:221-296`, nine `delivery_*` frontmatter fields,
  a `WRONG_TARGET` merge-gate check, the execution packet's `delivery` block,
  and `get_status.delivery` (`packages/mcp-server/src/index.ts:740`).
- **The lease mechanism exists** (CORE-115/124/125): `withLeaseLock`
  (`packages/core/src/store.ts:1177-1197`) is the board's write lock over
  `.kanmer/leases.lock`, re-entrant only within one async execution context;
  `leaseConfig` / `leaseState` (`packages/core/src/types.ts:940-991`) are the
  one expiry rule. It is **ticket-scoped**; a release channel has no ticket to
  hang off, so the mechanism is reused and the record is not.
- **The release-evidence consumer is complete and unreachable.**
  `packages/core/src/reconciliation.ts:76-91` hard-refuses on `contended` /
  `superseded` (`RELEASE_EVIDENCE_PRESERVED`) and joins `unavailable` to
  `EVIDENCE_INCONCLUSIVE`; `packages/mcp-server/src/reconciliation.ts:305-313`
  hard-codes `"not-applicable"` with a comment naming this ticket and
  forbidding a manufactured neutral observation.
- **The seam precedent is CORE-131.**
  `packages/mcp-server/src/reconciliation.ts:400-470` collects git/gh evidence
  outside every lock and then delegates to a locked store verb.
- **The carried-in defect is live.** `packages/mcp-server/src/index.ts:1082-1084`
  reads `resolveDelivery(board).integrationBranch`; `item` is already in scope
  at `:1059` and `prompts.ts:159-160` already accepts a verification target.
- **The roster is 40** (`smoke.mjs:69`, `smoke-protocol.mjs:160-161`,
  `AGENTS.md:435` and `:660`, `docs/manual/connect.md:145`,
  `tool-reference.md`, `chapters.generated.ts`, `plugins/kanmer/mcp/kanmer-mcp.cjs`).
- **The live MCP server is v0.3.12** (`639df4cf`), predating this horizon.
  Nothing merged in this run runs against the live board (ADR-0021), so live
  board behaviour is never evidence that a merged contract is enforced.

## Governing docs

- **FRD-031 — Configurable delivery and release state — Meets.** This ticket
  delivers AC2's immutable-candidate clause (an acquire on a candidate-enabled
  project mints an immutable candidate identity and ref), AC3 (the candidate id
  is digested over the integration SHA, so a changed SHA provably mints a new
  identity, and a superseding attempt starts with empty evidence), AC4
  (`RELEASE_CHANNEL_HELD` for a second concurrent owner; `complete` clears the
  lease and `supersede` hands it to the successor), and the edge case "an
  unavailable release service records a bounded retry schedule while other
  independent work continues" (the retry schedule is recorded on the attempt
  and surfaces only as `release.state: "unavailable"` for that attempt's
  tickets). AC1, AC5, the rest of AC2 and the unmerged-branch edge case are
  CORE-116's and are **not** touched. FRD-031 itself is **not modified**.
- **ADR-0021 — Stable control plane for candidate work — Meets.** The release
  records are a sidecar under `.kanmer/releases/`, invisible to the v0.3.12
  item scan and never written into `board.yml`, so the stable server keeps
  serving the live board unchanged. Nothing here promotes a candidate; CORE-119
  owns promotion. ADR-0021's "immutable failed attempt and its proof" is
  exactly the `fail` outcome's retention rule.
- **ADR-0005 — Proof, not deployment — Meets.** Release evidence stays
  non-gating: nothing in `gates.ts` or `profiles.ts` reads a release record, and
  CORE-116's "delivery state is not a gate" regression keeps passing.
- **No new ADR.** Every decision is inside FRD-031's stated behaviour; the ones
  FRD-031 leaves open are recorded in `open-questions` Q1-Q10 with alternatives.

## Required changes

### 1. New on-disk artefact: `.kanmer/releases/`

- `channels/<channel>.json` — the **mutable** lease. Fields: `schema: 1`,
  `channel`, `attempt_id`, `lease_id`, `lease_revision`, `owner`,
  `acquired_at`, `expires_at`, `heartbeat_at`.
- `attempts/<channel>@<ordinal>.json` — the attempt record. `@` is the
  separator precisely because `SAFE_ID_RE` excludes it, so `<channel>@<n>`
  parses unambiguously for any legal channel name. Fields:
  `schema: 1`, `attempt_id`, `channel`, `ordinal`, `candidate_id`,
  `candidate_ref`, `integration_sha`, `release_branch`, `created_at`, `owner`
  (**frozen at mint**); `release_tag`, `included_prs`, `included_tickets`,
  `artifact_manifest`, `verification_state`, `retry` (**recordable while
  active**); `outcome`, `terminal_at`, `successor`, `supersedes`,
  `failure_reason` (**terminal**).
- Channel names go through the existing id traversal guard
  (`paths.ts:239-249`). The default channel is `resolveDelivery(board).releaseBranch`.
- `candidate_id = "cand1:" + sha256({channel, integrationSha, ordinal}).slice(0,16)`,
  mirroring `computeRevision`'s `rev1:` idiom.
- `candidate_ref = releaseCandidatePattern.replace("*", channel + "-" + ordinal)`
  when the policy declares a pattern, else `null`.

### 2. Five store verbs, each wholly inside `withLeaseLock`

| Verb | Behaviour | Refusals |
|---|---|---|
| `acquireReleaseChannel` | Derive the next ordinal by `readdir` over `attempts/`, mint the candidate identity, write the attempt **then** the channel record | `RELEASE_CHANNEL_HELD` when a channel record exists — live **or** expired, naming the lease state and the reclaim path (`supersede`) |
| `renewReleaseChannel` | Bump `lease_revision`, `heartbeat_at`, `expires_at` from `leaseConfig(board)` | `LEASE_EXPIRED` on a `lease_id` mismatch; `Conflict:` (→ `REVISION_CONFLICT`) on a stale `lease_revision` |
| `recordReleaseProgress` | Record `verification_state`, `release_tag`, `included_prs`, `included_tickets`, `artifact_manifest`, or append one bounded retry entry from a caller-supplied `service_unavailable` observation; bump `lease_revision` | `RELEASE_ATTEMPT_TERMINAL` on a terminal attempt; `RELEASE_CANDIDATE_IMMUTABLE` if a frozen field would change |
| `supersedeReleaseAttempt` | Mark the incumbent `outcome: "superseded"` + `successor` + `terminal_at`; mint the successor at the new integration SHA with a **new** candidate identity and **empty** evidence and `supersedes`; repoint the channel with a fresh `lease_id` and `lease_revision: 1` | CAS as above; `CLAIM_LIVE` when the lease is live and the caller is not its owner without a `reason` beginning `operator:` (the `isOperatorReason` rule `transferTicket` already uses) |
| `completeReleaseAttempt` | `outcome: "released"`, `terminal_at`, optional `release_tag`/`artifact_manifest`, then **delete** the channel record — the lease is cleared (AC4) | CAS as above; `RELEASE_ATTEMPT_TERMINAL` |
| `failReleaseAttempt` | `outcome: "failed"`, `terminal_at`, `failure_reason`; the channel record is **retained** so a second owner cannot start on top of unexamined failure evidence (`open-questions` Q3) | CAS as above; `RELEASE_ATTEMPT_TERMINAL` |

Read-only: `releaseSnapshot()` returns `{ channels, attempts, unreadable }`
with no lock, degrading to `{ channels: [], attempts: [], unreadable: false }`
when `.kanmer/releases/` is absent and to `unreadable: true` on a parse or IO
failure.

### 3. Bounded retry schedule (the unavailable-release-service edge case)

`retry` on an active attempt: `{ attempts, max_attempts: 5, backoff_ms,
first_at, last_at, next_at, last_error, exhausted }`. Backoff doubles from
60_000 ms and is capped at `max_attempts`; the 6th observation sets
`exhausted: true` and stops advancing `next_at`. The schedule affects **only**
that attempt's tickets (via `release.state: "unavailable"`), so other
independent work continues — nothing global is blocked and no ticket stage
changes.

### 4. `classifyReleaseEvidence(snapshot, ticketId)` — pure, in core

Ordered, and the order is the contract:

1. `snapshot.unreadable` → `unavailable`.
2. No attempt lists `ticketId` in `included_tickets` → `not-applicable`.
3. A matching **non-terminal** attempt with a non-exhausted `retry` →
   `unavailable`.
4. More than one matching non-terminal attempt, **or** a matching non-terminal
   attempt that is not its channel's current holder → `contended`.
5. Exactly one matching non-terminal attempt which **is** the current holder →
   `not-applicable` (ownership is clean; there is nothing to preserve).
6. No matching non-terminal attempt and the most recent matching terminal
   attempt is `superseded` → `superseded`.
7. Otherwise (`released` / `failed`) → `not-applicable`. This is required, not
   incidental: goal.md Phase 14 says ordinary feature tickets must not sit in
   Verifying waiting for a release, so a finished release must not freeze a
   ticket's reconciliation.

### 5. One new MCP tool, `release_channel`, plus a free `get_status.release`

Action enum `acquire | renew | record | supersede | complete | fail`.
Roster 40 → 41 across nine sites (`files/files.md`); rationale and the
surfaces surveyed are in `open-questions` Q1. `get_status.release` is the read
side and costs no roster slot.

### 6. The lock/network seam

`collect (unlocked, MCP boundary) → verb (locked, store)`, exactly CORE-131's
placement and exactly what AGENTS.md §8 item 17 requires. The **only**
subprocess is a bounded `git rev-parse` resolving the integration SHA for
`acquire`/`supersede`, run at the MCP boundary before the store is entered,
with the `timeout`/`maxBuffer` options `mcp-server/src/reconciliation.ts`
already uses; a failure is a structured refusal, never a manufactured SHA. No
release service is ever contacted: `service_unavailable` is the *caller's*
bounded observation, recorded verbatim. Every store verb is pure fs + the lock.

### 7. Carried-in defect F-001

`packages/mcp-server/src/index.ts:1082-1084` becomes
`deliveryTargets(resolveDelivery(await store.getBoard()), item).verificationTarget`,
adding `deliveryTargets` to the existing import. `deliveryTargets` remains the
**single** definition of "hotfix" — a *recorded* `delivery_branch`, never a
branch-name heuristic.

## Expected files

| Action | Repo-root-relative path | Responsibility |
|---|---|---|
| Add | `packages/core/src/release.ts` | Record types, candidate identity, retry schedule, snapshot IO, `classifyReleaseEvidence` |
| Add | `packages/core/src/release.test.ts` | AC2/AC3/AC4, retry edge, classifier, in-lock concurrency |
| Modify | `packages/core/src/paths.ts` | `releasesRoot`/`releaseChannelsDir`/`releaseAttemptsDir`, channel-name guard |
| Modify | `packages/core/src/store.ts` | The six release verbs inside `withLeaseLock`, plus `releaseSnapshot()` |
| Modify | `packages/core/src/types.ts` | Widen the `ReconciliationEvidence.release` doc comment (shape unchanged) |
| Modify | `packages/core/src/index.ts` | Export the release surface |
| Add | `packages/mcp-server/src/release.ts` | The unlocked collect half + tool handler logic |
| Add | `packages/mcp-server/src/release.test.mjs` | Seam, error classification, F-001 regression |
| Modify | `packages/mcp-server/src/reconciliation.ts` | Replace the `not-applicable` stub with the classifier |
| Modify | `packages/mcp-server/src/errors.ts` | `RELEASE_CHANNEL_HELD` code + prefix |
| Modify | `packages/mcp-server/src/index.ts` | `release_channel` tool; `get_status.release`; **F-001 fix** |
| Modify | `packages/mcp-server/src/smoke.mjs` | 41 tools, name-list entry, release round trip |
| Modify | `packages/mcp-server/src/smoke-protocol.mjs` | 41 in the message **and** the predicate |
| Modify | `AGENTS.md` | §4 count, §8 item 19 parenthetical, new §8 item for the release lease |
| Modify | `docs/manual/connect.md` | 40 → 41 tools |
| Modify | `docs/manual/glossary.md` | Release channel / release attempt / candidate identity |
| Modify | `apps/gui/src/renderer/src/manual/chapters.generated.ts` | **Generated** — `npm run build:manual`, never hand-edited |
| Modify | `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | `release_channel` row, `get_status.release` |
| Modify | `plugins/kanmer/mcp/kanmer-mcp.cjs` (+ setup runtime) | **Generated** — `npm run plugin:build` from the main checkout, re-committed; `plugin:check` byte-compares |

## Do not modify

- `.worktrees/kanmer` (board worktree, orphan branch), `.worktrees/core-128`,
  `.worktrees/skill-036`, any `verify-*` worktree.
- `docs/functional/frd/FRD-031-*.md` — the contract is not edited.
- CORE-116's half of FRD-031: `resolveDelivery`, `deliveryTargets`,
  `assertDeliveryPolicy`, the `delivery_*` fields, `WRONG_TARGET`, the packet's
  `delivery` block. Read, reused, not re-implemented or "improved".
- `packages/core/src/gates.ts`, `profiles.ts` — release evidence is non-gating.
- `board.yml` / `BoardConfigSchema` — the release lease stays out of board config.
- `.github/workflows/*.yml`, `scripts/release*.mjs` — Kanmer's own repository
  and publishing policy.
- `packages/core/src/{io,docs,migrate,store}.test.ts`,
  `scripts/antigravity-plugin-config.test.mjs` — CORE-128's lane. New tests go
  in new files; stop and report if one of these must change.
- `plugins/kanmer/skills/kanmer-groom` — `verify-skill-prose.mjs:303` pins its
  prose.
- Board format 3 — no bump, no `migrate.ts` step.

## Constraints

- **Compatibility:** the live server is v0.3.12; the release records must stay
  outside `board.yml` and outside `.kanmer/areas/` so that server keeps reading
  the board unchanged. No format bump.
- **Locking:** every release verb runs inside `withLeaseLock`; nothing slow,
  networked or git-shaped may enter it (AGENTS.md §8 item 17). `withLeaseLock`
  is re-entrant only within one async execution context.
- **Ownership:** one ownership model only. Expiry never releases anything; an
  expired lease is reclaimed (`supersede`), never retaken.
- **Immutability:** identity fields are frozen at mint; a terminal attempt is
  frozen entirely; a successor never inherits evidence.
- **Security:** channel names are model-supplied and are embedded in filenames —
  they go through the same traversal guard as item ids.
- **Non-gating:** nothing in the gate engine may read a release record.
- **Tooling:** if the roster changes, all nine sites change in the same diff.
- **Environment:** `npm ci` in the worktree (otherwise `@kanmer/core` resolves
  to a stale checkout and typecheck fails); build the plugin bundle per
  AGENTS.md §8 gotcha 8; absolute paths in every git command.

## Ordered steps

1. **Worktree.** From a freshly fetched `origin/main` (`70d23efd`), create
   `.worktrees/core-132` on branch `core-132-release-channel-leases`, then
   `npm ci` in it. *(Prerequisite for everything.)*
2. **`packages/core/src/paths.ts`** — add `releasesRoot`,
   `releaseChannelsDir`, `releaseAttemptsDir` to `resolvePaths`, and
   `assertSafeChannel` reusing the existing `SAFE_ID_RE` guard. *(No behaviour
   change; everything below imports these.)*
3. **`packages/core/src/release.ts`** — record interfaces, `candidateIdentity`,
   `candidateRefFor`, `nextRetry`, `readReleaseSnapshot`,
   `classifyReleaseEvidence`, and the record read/write helpers built on
   `writeFileAtomic`. Pure + fs only. *(Depends on 2.)*
4. **`packages/core/src/store.ts`** — the six verbs and `releaseSnapshot()`,
   each verb's body wholly inside `withLeaseLock`, reading the records inside
   the lock and writing atomically. *(Depends on 3.)*
5. **`packages/core/src/index.ts` + `types.ts` doc comment** — export the
   surface; widen the `ReconciliationEvidence.release` comment to describe the
   producer instead of naming it as pending. *(Depends on 3-4.)*
6. **`packages/core/src/release.test.ts`** — AC2 (acquire mints an immutable
   candidate identity and, on a candidate-enabled policy, a candidate ref);
   AC3 (a supersede at a different integration SHA yields a different
   `candidate_id` and an attempt with empty evidence, and the incumbent is
   archived with `successor`); AC4 (a second `acquire` gets
   `RELEASE_CHANNEL_HELD`; `complete` deletes the channel record; `supersede`
   moves it); the retry edge (bounded, exhausts, does not block another
   channel or another ticket); the classifier's seven ordered cases; and an
   in-lock concurrency proof modelled on `claims.test.ts`. *(Depends on 4.)*
7. **`packages/mcp-server/src/errors.ts`** — `RELEASE_CHANNEL_HELD` in
   `KanmerErrorCode` and one prefix entry. *(Independent of 3-6.)*
8. **`packages/mcp-server/src/release.ts`** — the unlocked collect half
   (bounded `git rev-parse` with `timeout`/`maxBuffer`, structured refusal on
   failure) and the per-action delegation to the locked store verb. *(Depends
   on 4, 7.)*
9. **`packages/mcp-server/src/reconciliation.ts`** — replace the
   `not-applicable` stub with `classifyReleaseEvidence(await store.releaseSnapshot(), id)`,
   and update the comment to describe the producer. *(Depends on 3-4.)*
10. **`packages/mcp-server/src/index.ts`** — register `release_channel`; add
    `get_status.release`; **fix F-001** at `:1082-1084` via `deliveryTargets`.
    *(Depends on 8.)*
11. **`packages/mcp-server/src/release.test.mjs`** — the collect/verb seam, the
    `reconcile_ticket` wiring (still `not-applicable` on a board with no
    records; `superseded`/`contended`/`unavailable` on fixtures), the error
    classification, and the **F-001 regression**: a ticket whose recorded
    `delivery_branch` is the release branch on a dev-to-main policy gets a
    verify prompt naming the release branch, not the integration branch.
    *(Depends on 10.)*
12. **Roster: all nine sites in one commit** — `smoke.mjs:69` + name list,
    `smoke-protocol.mjs:160` + `:161`, `AGENTS.md:435` + `:660` (and the new
    §8 item), `docs/manual/connect.md:145`, `tool-reference.md`, then
    `npm run build:manual` for `chapters.generated.ts`. *(Depends on 10.)*
13. **`docs/manual/glossary.md`** entries. *(Independent; before `verify:docs`.)*
14. **Rebuild the artifacts** — `npm run build && npm run plugin:build` from
    the **main checkout** per AGENTS.md §8 gotcha 8, re-commit
    `plugins/kanmer/mcp/kanmer-mcp.cjs` and the setup runtime. *(Last: it
    depends on every source change.)*
15. **Run the rail step by step** (see Commands), record every exit code, open
    the PR with a `Kanmer: CORE-132` footer.

## Acceptance checks

- **Production caller / registration named:** `release_channel` is registered
  in `packages/mcp-server/src/index.ts` and asserted present by
  `smoke.mjs`'s name list; `get_status.release` is returned by the `get_status`
  handler; the release collector is called by
  `collectReconciliationEvidence`, which `reconcile_ticket` and
  `apply_reconciliation` both use. No dead code.
- **FRD-031 AC2 (immutable-candidate clause):** an `acquire` on a policy with a
  `releaseCandidatePattern` records a `candidate_id` and a `candidate_ref`, and
  neither can be changed afterwards.
- **FRD-031 AC3:** a `supersede` at a different integration SHA produces a
  different `candidate_id`; the successor's `included_prs`,
  `included_tickets`, `artifact_manifest` and `verification_state` are empty /
  `pending`; the incumbent is `superseded` with `successor` set and is frozen.
- **FRD-031 AC4:** a second `acquire` on a held channel is refused with
  `RELEASE_CHANNEL_HELD` (live **and** expired cases); `complete` removes the
  channel record; `supersede` repoints it to the successor with a fresh
  `lease_id`; `fail` retains both the channel record and the attempt's proof.
- **Unavailable-release-service edge case:** repeated `service_unavailable`
  observations produce a bounded, exhausting retry schedule; the affected
  tickets read `release.state: "unavailable"` while an unrelated ticket on the
  same board still reads `not-applicable`.
- **Carried-in F-001:** a hotfix ticket's `dispatch_task` verification prompt
  names the hotfix verification target, not the integration branch — proved by
  a test that constructs a dev-to-main policy and a ticket whose recorded
  `delivery_branch` is the release branch.
- **Non-gating regression:** CORE-116's "delivery state is not a gate" test
  still passes, and no release record can move a ticket.
- **v0.3.12 compatibility:** the board's `board.yml` and `.kanmer/areas/` are
  byte-unchanged by a full release cycle in the fixtures; the only new paths
  are under `.kanmer/releases/`.
- **Lock discipline:** the store verbs contain no subprocess and no network
  call; the only `git` in this diff is at the MCP boundary, outside the lock.
- **Roster:** exactly 41 tools, asserted in both smoke files, with all nine
  documentation/artifact sites consistent.
- **Tests prove the claim** without weakened assertions; every command's exit
  code is recorded, and a retry never erases the first failure.

## Commands

Run from the worktree `C:\Users\Alex\Documents\GitHub\kanmer\.worktrees\core-132`
unless stated. **`npm run verify` is not usable**: it exits 1 on
`scripts/antigravity-plugin-config.test.mjs` (Windows `EBUSY` ×2), CORE-128's
active lane, and the rail is fail-fast — so every step it would skip is run
individually and its exit code recorded.

```
npm ci
npm run build
npm run check:manual
npm run test -w @kanmer/core
npm run test -w @kanmer/gui
npm run test:http -w @kanmer/mcp-server
npm run test:scripts                 # expected: EBUSY x2, CORE-128's lane
npm run typecheck
npm run verify:docs
node packages/mcp-server/src/smoke.mjs
npm run smoke:headless
npm run mcpb:check
npm run smoke:protocol
npm run smoke:discovery
npm run verify:skills
npm run verify:agents-block
npm run plugin:check
```

Artifact rebuild, from the **main checkout**
`C:\Users\Alex\Documents\GitHub\kanmer` per AGENTS.md §8 gotcha 8:
`npm run build && npm run plugin:build`, then `npm run build:manual`.

Hosted: the PR's required checks. A red run in the known Windows timing class
(`store.test.ts` / `claims.test.ts` / `docs.test.ts` 5s timeouts and teardown
`ENOTEMPTY`) is discharged only with a same-SHA re-run, a diff-untouched
confirmation and a structural mechanism argument — never with an assertion, and
the first failure is retained.

## Failure and deviation rules

- Stop and report on: a failing check that is not the known Windows timing
  class; an unknown API or file; scope expansion beyond this plan's Expected
  files; a dependency addition; a conflict with FRD-031, ADR-0021 or ADR-0005;
  a need to edit one of CORE-128's five test files; or any unsafe command.
- A command that cannot run is **INCONCLUSIVE**, never a fabricated pass. A
  later pass never erases an earlier failure — both are recorded.
- Deviations are recorded in the post-implementation report with their reason;
  they are never silent redesigns.
- Never touch `.worktrees/kanmer`, `.worktrees/core-128`, `.worktrees/skill-036`
  or any `verify-*` worktree. Never commit or push `kanmer-board`; MCP board
  writes are left uncommitted for the controller.

## Stop condition

A PR is open against `main` with a `Kanmer: CORE-132` footer, the
post-implementation report is written, and the ticket is in **Review**. Do not
review, do not merge, do not resolve review threads, do not file follow-up
tickets, do not start another ticket. A `BLOCKED` merge state caused by
`required_conversation_resolution: true` is the reviewer's job, not a defect.
