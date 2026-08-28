# Checklist — CORE-132

One box per ordered plan step or acceptance check. Append progress notes rather
than rewriting.

## Setup

- [x] Step 1 — Create `.worktrees/core-132` on branch `core-132-release-channel-leases` from freshly fetched `origin/main` `70d23efd`, absolute paths in every git command.
- [x] Step 1 — Run `npm ci` in the worktree and record its exit code (without it `@kanmer/core` resolves to a stale checkout and typecheck fails).

## Core

- [x] Step 2 — Add `releasesRoot` / `releaseChannelsDir` / `releaseAttemptsDir` to `resolvePaths` and a channel-name traversal guard reusing `SAFE_ID_RE` in `packages/core/src/paths.ts`.
- [x] Step 3 — Add `packages/core/src/release.ts`: record interfaces, `candidateIdentity` (`cand1:` digest over channel + integration SHA + ordinal), `candidateRefFor`, `nextRetry` (bounded, exhausting), snapshot read, and atomic record writes. Pure + fs only.
- [x] Step 3 — Add `classifyReleaseEvidence(snapshot, ticketId)` implementing the seven ordered cases exactly as the plan states, including `released`/`failed` ⇒ `not-applicable`.
- [x] Step 4 — Add `acquireReleaseChannel` to `store.ts` inside `withLeaseLock`: derive ordinal, mint identity, write attempt then channel record; refuse `RELEASE_CHANNEL_HELD` when a channel record exists live **or** expired.
- [x] Step 4 — Add `renewReleaseChannel` inside `withLeaseLock`: `LEASE_EXPIRED` on `lease_id` mismatch, `Conflict:` on stale `lease_revision`, bump revision/heartbeat/expiry from `leaseConfig(board)`.
- [x] Step 4 — Add `recordReleaseProgress` inside `withLeaseLock`, refusing `RELEASE_ATTEMPT_TERMINAL` and `RELEASE_CANDIDATE_IMMUTABLE`, and appending one bounded retry entry for a `service_unavailable` observation.
- [x] Step 4 — Add `supersedeReleaseAttempt` inside `withLeaseLock`: archive the incumbent with `successor`, mint the successor with a new candidate identity and empty evidence, repoint the channel with a fresh `lease_id` and `lease_revision: 1`; `CLAIM_LIVE` unless owner or `operator:` reason.
- [x] Step 4 — Add `completeReleaseAttempt` (clears the channel record) and `failReleaseAttempt` (retains it) inside `withLeaseLock`.
- [x] Step 4 — Add read-only `releaseSnapshot()` that takes no lock and reports `unreadable: true` on parse/IO failure rather than a neutral observation.
- [x] Step 4 — Confirm by reading the diff that no store verb body contains a subprocess, a network call, or a git command.
- [x] Step 5 — Export the release surface from `packages/core/src/index.ts` and widen the `ReconciliationEvidence.release` doc comment in `types.ts` (shape unchanged).

## Core tests

- [x] Step 6 — `release.test.ts`: AC2 — an acquire on a candidate-enabled policy mints an immutable `candidate_id` and `candidate_ref`, and neither can be changed.
- [x] Step 6 — AC3 — a supersede at a different integration SHA yields a different `candidate_id`, an empty-evidence successor, and an incumbent archived `superseded` with `successor` set and frozen.
- [x] Step 6 — AC4 — a second acquire is refused `RELEASE_CHANNEL_HELD` for both a live and an expired lease; `complete` deletes the channel record; `supersede` repoints it; `fail` retains it and the attempt's proof.
- [x] Step 6 — Edge case — repeated `service_unavailable` observations produce a bounded retry schedule that exhausts, and neither blocks another channel nor another ticket.
- [x] Step 6 — Classifier — all seven ordered cases, including a board with no release records reading `not-applicable`.
- [x] Step 6 — Concurrency — a second `KanmerStore` parked inside the critical section proves the release verbs serialise, modelled on `claims.test.ts`.
- [x] Step 6 — v0.3.12 compatibility — a full release cycle leaves `board.yml` and `.kanmer/areas/` byte-unchanged; the only new paths are under `.kanmer/releases/`.
- [x] Step 6 — Non-gating — a recorded release cannot move a ticket, and CORE-116's "delivery state is not a gate" test still passes.

## MCP server

- [x] Step 7 — Add `RELEASE_CHANNEL_HELD` to `KanmerErrorCode` and its message prefix to the classifier in `errors.ts`.
- [x] Step 8 — Add `packages/mcp-server/src/release.ts`: the unlocked collect half (bounded `git rev-parse` with `timeout`/`maxBuffer`, structured refusal on failure, never a manufactured SHA) delegating to the locked store verb — CORE-131's seam.
- [x] Step 9 — Replace the `not-applicable` stub at `reconciliation.ts:305-313` with `classifyReleaseEvidence` over the persisted records, and rewrite the comment to describe the producer.
- [x] Step 10 — Register the `release_channel` tool in `index.ts` with the `acquire|renew|record|supersede|complete|fail` action enum and `expected_project`.
- [x] Step 10 — Add `get_status.release` beside `get_status.delivery`, degrading to empty when `.kanmer/` does not exist (a read tool must never create it).
- [x] Step 10 — **F-001**: route `dispatch_task`'s verification prompt through `deliveryTargets(resolveDelivery(board), item).verificationTarget`, importing `deliveryTargets`; introduce no second definition of "hotfix".

## MCP tests

- [x] Step 11 — `release.test.mjs`: the collect/verb seam, and `RELEASE_CHANNEL_HELD` classified as a structured error at the MCP boundary.
- [x] Step 11 — `reconcile_ticket` reads `not-applicable` on a board with no release records, and `superseded` / `contended` / `unavailable` on the matching fixtures.
- [x] Step 11 — **F-001 regression**: a ticket whose recorded `delivery_branch` is the release branch on a dev-to-main policy gets a verify prompt naming the release branch, not the integration branch.

## Roster and docs (one diff)

- [x] Step 12 — `smoke.mjs`: tool count 40 → 41 and `release_channel` added to the name list; plus a `release_channel` round trip and a `get_status.release` assertion.
- [x] Step 12 — `smoke-protocol.mjs`: the message string **and** the predicate both 41.
- [x] Step 12 — `AGENTS.md`: §4 tool count, §8 item 19's parenthetical, and a new §8 item for the release-channel lease and its collect/apply seam.
- [x] Step 12 — `docs/manual/connect.md` 40 → 41, then `npm run build:manual` to regenerate `chapters.generated.ts` (never hand-edited).
- [x] Step 12 — `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md`: a `release_channel` row under Write tools and `get_status.release`.
- [x] Step 13 — `docs/manual/glossary.md`: release channel, release attempt, candidate identity.

## Artifacts and verification

- [x] Step 14 — `npm run build && npm run plugin:build`; re-commit `plugins/kanmer/mcp/kanmer-mcp.cjs` and the setup runtime so `plugin:check` byte-compares clean.
- [x] Step 15 — Run every rail step individually (`npm run verify` is unusable: `antigravity-plugin-config.test.mjs` EBUSY ×2, CORE-128's lane) and record each command with its exit code; INCONCLUSIVE is never PASS and a retry never erases the first failure.
- [x] Step 15 — Write the post-implementation report naming every file changed, every command and exit code, the lock/network seam placement, the tool-roster decision, and any deviation.
- [x] Step 15 — Open the PR against `main` with a `Kanmer: CORE-132` footer and move the ticket to Review.
- [x] Step 15 — Stop at the approved boundary: do not review, merge, resolve review threads, file follow-up tickets, or start another ticket. A `BLOCKED` merge state from `required_conversation_resolution` is the reviewer's job.

## Progress notes

**2026-08-28 — implemented in one pass; head `abf707d9`, PR #303.**

- Branched from `origin/main` `70d23efd`, `npm ci` in `.worktrees/core-132`
  (exit 0), so `@kanmer/core` resolves to this checkout and `plugin:check`
  accepts it.
- **Deviation (step 14, minor):** the plugin bundle was rebuilt **from the
  worktree**, not from the main checkout. AGENTS.md §8 gotcha 8 asks for a
  rebuild; `check-plugin-sync.mjs:49-66` is the actual guard, and its own
  comment says it checks whether a checkout *owns its `@kanmer/core`
  resolution*, which `npm ci` gives it. The main checkout is two commits behind
  `origin/main` and does not contain this change, so building there would have
  produced a bundle without it. `plugin:check` passed: "41 tools match, bundle
  bytes match, isolated MCP handshake lists 41 tools".
- **Deviation (step 8, additive):** `packages/mcp-server/tsup.config.ts` gained
  `src/release.ts` and `src/errors.ts` as ESM entries, because the `.mjs` tests
  import from `dist/` and neither was emitted. This is exactly why
  `src/reconciliation.ts` is already an entry. Not in the plan's Expected files;
  recorded rather than absorbed silently. `packages/mcp-server/package.json`
  likewise gained `src/release.test.mjs` in `test:http`.
- **Deviation (step 6, test shape):** the non-gating regression was first
  written by creating a ticket directly in `verifying`, which the gate engine
  let through to `done`. Rewritten to walk the pipeline the way CORE-116's own
  regression does, then record a *completed, verified* release attempt naming
  the ticket, and assert Done is still refused naming `proof`. The first shape
  was wrong, not the assertion; nothing was weakened.
- **One retained failure:** `npm run test:scripts` exit 1 — 134/136, the two
  known `antigravity-plugin-config.test.mjs` Windows `EBUSY` tests, CORE-128's
  active lane. Untouched by this diff, which contains no `scripts/` change at
  all. Not retried, not erased.
- Everything else green, each command run individually because
  `npm run verify` is fail-fast on that same pair: build, `check:manual`,
  core 605/605, gui 524/524, mcp-server 161/161, typecheck, `verify:docs`,
  smoke 348/348, `smoke:headless`, `mcpb:check`, `smoke:protocol` 50/50,
  `smoke:discovery` 13/13, `verify:skills`, `verify:agents-block` 31/31,
  `plugin:check`.
