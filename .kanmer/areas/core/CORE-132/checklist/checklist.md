# Checklist — CORE-132

One box per ordered plan step or acceptance check. Append progress notes rather
than rewriting.

## Setup

- [ ] Step 1 — Create `.worktrees/core-132` on branch `core-132-release-channel-leases` from freshly fetched `origin/main` `70d23efd`, absolute paths in every git command.
- [ ] Step 1 — Run `npm ci` in the worktree and record its exit code (without it `@kanmer/core` resolves to a stale checkout and typecheck fails).

## Core

- [ ] Step 2 — Add `releasesRoot` / `releaseChannelsDir` / `releaseAttemptsDir` to `resolvePaths` and a channel-name traversal guard reusing `SAFE_ID_RE` in `packages/core/src/paths.ts`.
- [ ] Step 3 — Add `packages/core/src/release.ts`: record interfaces, `candidateIdentity` (`cand1:` digest over channel + integration SHA + ordinal), `candidateRefFor`, `nextRetry` (bounded, exhausting), snapshot read, and atomic record writes. Pure + fs only.
- [ ] Step 3 — Add `classifyReleaseEvidence(snapshot, ticketId)` implementing the seven ordered cases exactly as the plan states, including `released`/`failed` ⇒ `not-applicable`.
- [ ] Step 4 — Add `acquireReleaseChannel` to `store.ts` inside `withLeaseLock`: derive ordinal, mint identity, write attempt then channel record; refuse `RELEASE_CHANNEL_HELD` when a channel record exists live **or** expired.
- [ ] Step 4 — Add `renewReleaseChannel` inside `withLeaseLock`: `LEASE_EXPIRED` on `lease_id` mismatch, `Conflict:` on stale `lease_revision`, bump revision/heartbeat/expiry from `leaseConfig(board)`.
- [ ] Step 4 — Add `recordReleaseProgress` inside `withLeaseLock`, refusing `RELEASE_ATTEMPT_TERMINAL` and `RELEASE_CANDIDATE_IMMUTABLE`, and appending one bounded retry entry for a `service_unavailable` observation.
- [ ] Step 4 — Add `supersedeReleaseAttempt` inside `withLeaseLock`: archive the incumbent with `successor`, mint the successor with a new candidate identity and empty evidence, repoint the channel with a fresh `lease_id` and `lease_revision: 1`; `CLAIM_LIVE` unless owner or `operator:` reason.
- [ ] Step 4 — Add `completeReleaseAttempt` (clears the channel record) and `failReleaseAttempt` (retains it) inside `withLeaseLock`.
- [ ] Step 4 — Add read-only `releaseSnapshot()` that takes no lock and reports `unreadable: true` on parse/IO failure rather than a neutral observation.
- [ ] Step 4 — Confirm by reading the diff that no store verb body contains a subprocess, a network call, or a git command.
- [ ] Step 5 — Export the release surface from `packages/core/src/index.ts` and widen the `ReconciliationEvidence.release` doc comment in `types.ts` (shape unchanged).

## Core tests

- [ ] Step 6 — `release.test.ts`: AC2 — an acquire on a candidate-enabled policy mints an immutable `candidate_id` and `candidate_ref`, and neither can be changed.
- [ ] Step 6 — AC3 — a supersede at a different integration SHA yields a different `candidate_id`, an empty-evidence successor, and an incumbent archived `superseded` with `successor` set and frozen.
- [ ] Step 6 — AC4 — a second acquire is refused `RELEASE_CHANNEL_HELD` for both a live and an expired lease; `complete` deletes the channel record; `supersede` repoints it; `fail` retains it and the attempt's proof.
- [ ] Step 6 — Edge case — repeated `service_unavailable` observations produce a bounded retry schedule that exhausts, and neither blocks another channel nor another ticket.
- [ ] Step 6 — Classifier — all seven ordered cases, including a board with no release records reading `not-applicable`.
- [ ] Step 6 — Concurrency — a second `KanmerStore` parked inside the critical section proves the release verbs serialise, modelled on `claims.test.ts`.
- [ ] Step 6 — v0.3.12 compatibility — a full release cycle leaves `board.yml` and `.kanmer/areas/` byte-unchanged; the only new paths are under `.kanmer/releases/`.
- [ ] Step 6 — Non-gating — a recorded release cannot move a ticket, and CORE-116's "delivery state is not a gate" test still passes.

## MCP server

- [ ] Step 7 — Add `RELEASE_CHANNEL_HELD` to `KanmerErrorCode` and its message prefix to the classifier in `errors.ts`.
- [ ] Step 8 — Add `packages/mcp-server/src/release.ts`: the unlocked collect half (bounded `git rev-parse` with `timeout`/`maxBuffer`, structured refusal on failure, never a manufactured SHA) delegating to the locked store verb — CORE-131's seam.
- [ ] Step 9 — Replace the `not-applicable` stub at `reconciliation.ts:305-313` with `classifyReleaseEvidence` over the persisted records, and rewrite the comment to describe the producer.
- [ ] Step 10 — Register the `release_channel` tool in `index.ts` with the `acquire|renew|record|supersede|complete|fail` action enum and `expected_project`.
- [ ] Step 10 — Add `get_status.release` beside `get_status.delivery`, degrading to empty when `.kanmer/` does not exist (a read tool must never create it).
- [ ] Step 10 — **F-001**: route `dispatch_task`'s verification prompt through `deliveryTargets(resolveDelivery(board), item).verificationTarget`, importing `deliveryTargets`; introduce no second definition of "hotfix".

## MCP tests

- [ ] Step 11 — `release.test.mjs`: the collect/verb seam, and `RELEASE_CHANNEL_HELD` classified as a structured error at the MCP boundary.
- [ ] Step 11 — `reconcile_ticket` reads `not-applicable` on a board with no release records, and `superseded` / `contended` / `unavailable` on the matching fixtures.
- [ ] Step 11 — **F-001 regression**: a ticket whose recorded `delivery_branch` is the release branch on a dev-to-main policy gets a verify prompt naming the release branch, not the integration branch.

## Roster and docs (one diff)

- [ ] Step 12 — `smoke.mjs`: tool count 40 → 41 and `release_channel` added to the name list; plus a `release_channel` round trip and a `get_status.release` assertion.
- [ ] Step 12 — `smoke-protocol.mjs`: the message string **and** the predicate both 41.
- [ ] Step 12 — `AGENTS.md`: §4 tool count, §8 item 19's parenthetical, and a new §8 item for the release-channel lease and its collect/apply seam.
- [ ] Step 12 — `docs/manual/connect.md` 40 → 41, then `npm run build:manual` to regenerate `chapters.generated.ts` (never hand-edited).
- [ ] Step 12 — `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md`: a `release_channel` row under Write tools and `get_status.release`.
- [ ] Step 13 — `docs/manual/glossary.md`: release channel, release attempt, candidate identity.

## Artifacts and verification

- [ ] Step 14 — `npm run build && npm run plugin:build` from the **main checkout** per AGENTS.md §8 gotcha 8; re-commit `plugins/kanmer/mcp/kanmer-mcp.cjs` and the setup runtime so `plugin:check` byte-compares clean.
- [ ] Step 15 — Run every rail step individually (`npm run verify` is unusable: `antigravity-plugin-config.test.mjs` EBUSY ×2, CORE-128's lane) and record each command with its exit code; INCONCLUSIVE is never PASS and a retry never erases the first failure.
- [ ] Step 15 — Write the post-implementation report naming every file changed, every command and exit code, the lock/network seam placement, the tool-roster decision, and any deviation.
- [ ] Step 15 — Open the PR against `main` with a `Kanmer: CORE-132` footer and move the ticket to Review.
- [ ] Step 15 — Stop at the approved boundary: do not review, merge, resolve review threads, file follow-up tickets, or start another ticket. A `BLOCKED` merge state from `required_conversation_resolution` is the reviewer's job.

## Progress notes

Append with `set_ticket_doc(doc: "checklist", append: true)`.
