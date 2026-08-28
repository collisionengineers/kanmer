# Post-implementation report — CORE-132

**Branch:** `core-132-release-channel-leases` · **Worktree:** `.worktrees/core-132`
**Base:** `origin/main` `70d23efd` · **Head:** `abf707d98a2ddbde02dafb31cc652c72bbea73b6`
**PR:** https://github.com/collisionengineers/kanmer/pull/303

## What was built

The second half of FRD-031, exactly as planned. No step was dropped and no
extra scope was absorbed.

One renewable lease owns a release channel at a time, and a release attempt is
an immutable-identity record. Both live in a new sidecar under
`.kanmer/releases/` — `channels/<channel>.json` (the mutable lease) and
`attempts/<channel>@<ordinal>.json` (the attempts). `@` is the separator
precisely because `SAFE_ID_RE` excludes it, which makes `<channel>@<ordinal>`
parse unambiguously for every legal channel name.

## Files changed and why

| File | Change |
|---|---|
| `packages/core/src/release.ts` **(new, 452 lines)** | The whole release model: record types, `candidateIdentity` / `candidateRefFor`, the bounded `nextRetry`, `releaseLeaseExpired`, snapshot + record IO, `nextOrdinal`, and `classifyReleaseEvidence`. Pure plus filesystem; no lock, no subprocess, no network. |
| `packages/core/src/paths.ts` | `releasesRoot` / `releaseChannelsDir` / `releaseAttemptsDir` on `resolvePaths`, and `assertSafeChannel` reusing the existing `SAFE_ID_RE` traversal guard. |
| `packages/core/src/store.ts` | Six verbs — `acquireReleaseChannel`, `renewReleaseChannel`, `recordReleaseProgress`, `supersedeReleaseAttempt`, `completeReleaseAttempt`, `failReleaseAttempt` — each wholly inside `withLeaseLock`; plus read-only `releaseSnapshot()`, the private `readHeldChannel` CAS, `assertAttemptWritable`, `assertCandidateImmutable`, `assertIntegrationSha` and `mintAttempt`. |
| `packages/core/src/types.ts` | The `ReconciliationEvidence.release` doc comment now describes the producer instead of naming it as pending. **Shape unchanged.** |
| `packages/core/src/index.ts` | Exports `./release.js`. |
| `packages/core/src/release.test.ts` **(new, 43 tests)** | AC2, AC3, AC4, the retry edge, the classifier's seven ordered cases, the v0.3.12 sidecar guarantee, the non-gating regression and two in-lock concurrency proofs. |
| `packages/mcp-server/src/release.ts` **(new)** | The unlocked collect half: `resolveIntegrationSha` (bounded `git rev-parse`, structured refusal on failure), `releaseChannelAction` (per-action delegation to the locked verb) and `releaseStatus` (the `get_status` read). |
| `packages/mcp-server/src/reconciliation.ts` | The `not-applicable` stub is replaced by `classifyReleaseEvidence(await store.releaseSnapshot(), id)`, with the comment rewritten to describe the producer. |
| `packages/mcp-server/src/errors.ts` | `RELEASE_CHANNEL_HELD` added to `KanmerErrorCode` with its message prefix; `RELEASE_ATTEMPT_TERMINAL` / `RELEASE_CANDIDATE_IMMUTABLE` / `RELEASE_ATTEMPT_MISSING` classify as `LEASE_CONFLICT`. |
| `packages/mcp-server/src/index.ts` | The `release_channel` tool; `get_status.release`; **the F-001 fix**. |
| `packages/mcp-server/src/release.test.mjs` **(new, 17 tests)** | The collect/verb seam and its bounds, the `reconcile_ticket` wiring across all four evidence states, error classification, and the F-001 regression. |
| `packages/mcp-server/tsup.config.ts` | `src/release.ts` and `src/errors.ts` added as ESM entries so the `.mjs` tests can import them from `dist/`, exactly as `src/reconciliation.ts` already is. |
| `packages/mcp-server/package.json` | `src/release.test.mjs` added to `test:http`. |
| `packages/mcp-server/src/smoke.mjs` | Tool count 40 → 41, `release_channel` in the name list, and an eight-check release block driving a whole cycle over MCP. |
| `packages/mcp-server/src/smoke-protocol.mjs` | 41 in the message **and** in the predicate. |
| `AGENTS.md` | §4 count 40 → 41; §8 item 19's parenthetical; new §8 item 22 for the release-channel lease, its sidecar rationale, its seam and its evidence ordering. |
| `docs/manual/connect.md` | 40 → 41 tools. |
| `docs/manual/glossary.md` | Release channel, release attempt, candidate identity. |
| `apps/gui/src/renderer/src/manual/chapters.generated.ts` | **Generated** — `npm run build:manual`. |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | `release_channel` row under Write tools; `get_status.release` on the `get_status` row. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` (+ `plugins/kanmer/scripts/agents-block*.mjs`) | **Generated** — `npm run plugin:build`; `plugin:check` byte-compares. |

## Governing docs

- **FRD-031 — Meets.** AC2's immutable-candidate clause (`acquire` mints
  `candidate_id` and `candidate_ref`; eight identity fields frozen at mint,
  terminal attempts frozen whole). AC3 (`candidate_id` is a digest **over the
  integration SHA**, so a changed SHA cannot reproduce it; a successor starts
  with empty artifacts and `verification_state: pending`). AC4
  (`RELEASE_CHANNEL_HELD` for a second owner; `complete` clears the lease,
  `supersede` hands it to the successor). The unavailable-service edge case (a
  bounded, exhausting retry schedule scoped to that attempt's tickets).
  **FRD-031 itself was not edited.**
- **ADR-0021 — Meets.** The records are a sidecar invisible to the v0.3.12 item
  scan and never written into `board.yml`, proven by a test and a smoke check
  that assert `board.yml` and `.kanmer/areas/` are byte-unchanged across a full
  release cycle. ADR-0021's "immutable failed attempt and its proof" is the
  `fail` outcome's retention rule.
- **ADR-0005 — Meets.** Nothing in `gates.ts` or `profiles.ts` reads a release
  record; a completed, verified release naming a ticket still cannot move it to
  Done without proof.
- **No new ADR.** Every open decision is recorded in `open-questions` Q1-Q10
  with its alternative.

## The lock / network seam

`collect (unlocked, MCP boundary) → verb (locked, store)` — CORE-131's
placement, for the reason AGENTS.md §8 item 17 gives.

- The **only** subprocess in the diff is `git rev-parse --verify <ref>^{commit}`
  in `packages/mcp-server/src/release.ts`, run before the store is entered, with
  the same `cwd` / `windowsHide` / `timeout` / `maxBuffer` bounds the
  reconciliation collector uses. A ref that will not resolve, or a non-SHA
  answer, is a structured `RELEASE_SHA_UNAVAILABLE` refusal — a candidate
  identity is never minted from a guessed SHA. Tested with an injected `run`
  that asserts the exact argv and every bound.
- **No release service is contacted anywhere.** `service_unavailable` is the
  caller's own bounded observation, recorded verbatim.
- Every store verb body is filesystem work inside `withLeaseLock`: read the
  records, check the CAS, write atomically. No subprocess, no network, no git.
- `reconcile_ticket`'s release read (`store.releaseSnapshot()`) takes no lock,
  like every other evidence read there.

## Tool roster decision: 40 → 41, one tool

Added **`release_channel`**, one action-based write tool
(`acquire | renew | record | supersede | complete | fail`) — the shape
`take_ticket` already uses for the ticket-lease surface. The read side is
`get_status.release` and costs no roster slot.

Every existing id-taking tool is ticket-, group- or column-scoped, and AGENTS.md
§8 item 16 records that smoke pins **no** tool schema growing a `root`/path
field, so nothing existing could host a board-scoped channel without lying about
its `id`. Shipping only the core/store API would have left the collector wiring
unreachable and `release.state` permanently `not-applicable` — a stub, not an
implementation (AGENTS.md §8 item 18). goal.md's NO-CHURN rule forbids *many
narrow* workflow tools, which one action-based tool for a whole FRD phase is
not. Reasoning and the rejected alternative are in `open-questions` Q1.

All nine sites moved in the same commit: `smoke.mjs` count + name list,
`smoke-protocol.mjs` message + predicate, `AGENTS.md` §4 + §8 item 19,
`docs/manual/connect.md`, the regenerated `chapters.generated.ts`,
`tool-reference.md`, and the re-committed `plugins/kanmer/mcp/kanmer-mcp.cjs`.
`plugin:check` reports "41 tools match, bundle bytes match".

## Carried-in defect F-001

`packages/mcp-server/src/index.ts` now reads

```ts
const verificationTarget = deliveryTargets(resolveDelivery(await store.getBoard()), item).verificationTarget;
```

`deliveryTargets` remains the **single** definition of "hotfix" — a *recorded*
`delivery_branch`, never a branch-name heuristic. Two assertions pin it: the
old expression is gone and the new one is present, and `board.ts` still
contains exactly one `const hotfix =`. A behavioural test proves a dev-to-main
project's hotfix gets `on merged main` while an ordinary ticket gets
`on merged dev`, and that the old expression would have produced `dev` for both.

## Commands and exit codes

Run from `.worktrees/core-132`. **`npm run verify` was not used**: it is
fail-fast and exits 1 on `scripts/antigravity-plugin-config.test.mjs` (Windows
`EBUSY` ×2), which is CORE-128's active lane. Every step it would have skipped
was run individually.

| Command | Exit | Result |
|---|---|---|
| `npm ci` | 0 | |
| `npm run build` | 0 | |
| `npm run check:manual` | 0 | manual up to date (22 chapters) |
| `npm run test -w @kanmer/core` | 0 | 24 files, **605 passed** (43 new) |
| `npm run test -w @kanmer/gui` | 0 | 54 files, **524 passed** |
| `npm run test:http -w @kanmer/mcp-server` | 0 | **161 passed** (17 new) |
| `npm run test:scripts` | **1** | 134/136 — the two known `antigravity-plugin-config.test.mjs` `EBUSY` failures. See below. |
| `npm run typecheck` | 0 | |
| `npm run verify:docs` | 0 | |
| `node packages/mcp-server/src/smoke.mjs` | 0 | **348/348** |
| `npm run smoke:headless` | 0 | |
| `npm run mcpb:check` | 0 | 3 files, 1 732 833 bytes |
| `npm run smoke:protocol` | 0 | **50/50** |
| `npm run smoke:discovery` | 0 | **13/13** |
| `npm run verify:skills` | 0 | ALL CHECKS PASSED |
| `npm run verify:agents-block` | 0 | **31/31** |
| `npm run plugin:build` | 0 | |
| `npm run plugin:check` | 0 | "41 tools match, bundle bytes match, isolated MCP handshake lists 41 tools" |

**The one non-zero exit, retained rather than erased.** `npm run test:scripts`
exits 1 on exactly two tests in `scripts/antigravity-plugin-config.test.mjs`
("the quote-free launcher still reaches the shim when LOCALAPPDATA contains
spaces" and "the shipped installer shim restores the provider cwd before MCP
launch"), the Windows `EBUSY` pair the packet names as CORE-128's active,
off-limits lane. Mechanism argument: this diff touches no file that test reads —
it exercises the installer shim and launcher scripts, and nothing under
`scripts/` or the Antigravity provider surface is in the diff at all. 134 of 136
script tests pass, including every plugin, release-flow and manifest test.

## Risks and follow-ups (recorded, not filed — HZN-008 scope discipline)

- **Residual, accepted:** the retry schedule is *data*, not a timer. Nothing in
  Kanmer wakes up and retries; the caller re-reports. That is deliberate — a
  scheduler is an HZN-008 non-goal — but it means an abandoned attempt's
  schedule sits at `exhausted` until somebody supersedes it. The lease's
  ordinary expiry is the backstop.
- **Residual, accepted:** a release branch that is not a legal channel name (for
  example `release/next`) is refused with a message telling the caller to name
  the channel explicitly, rather than being slugified. Silent slugification
  could collide two branches onto one channel, which is exactly the failure this
  ticket exists to prevent.
- **Parked operator-only question** (see `open-questions`): who may hold a
  release channel. The recommendation — any caller, with the lease itself as the
  serialization — is implemented as the default, so nothing is blocked.

## For `kanmer-verify` on the merged result

At the exact merge SHA, in a disposable detached worktree:

1. `npm ci`, then `npm run build`.
2. `npm run test -w @kanmer/core` — expect 605 passed, including
   `src/release.test.ts` 43/43.
3. `npm run test:http -w @kanmer/mcp-server` — expect
   `src/release.test.mjs` 17/17.
4. `node packages/mcp-server/src/smoke.mjs` — expect 348/348, including
   "tools/list returns 41 tools" and the eight release checks.
5. `npm run plugin:check` — expect "41 tools match, bundle bytes match".
6. `npm run typecheck`, `npm run verify:docs`, `npm run verify:skills`,
   `npm run verify:agents-block`, `npm run smoke:protocol`,
   `npm run smoke:discovery`, `npm run smoke:headless`, `npm run mcpb:check`.

`npm run test:scripts` is expected to exit 1 on the two
`antigravity-plugin-config.test.mjs` `EBUSY` tests (CORE-128's lane) and
`npm run verify` is unusable for the same reason; record both rather than
treating either as a regression. The `store.test.ts` / `claims.test.ts` /
`docs.test.ts` 5s-timeout and teardown-`ENOTEMPTY` class reaches hosted CI too:
discharge a red run with a same-SHA re-run, a diff-untouched confirmation and a
mechanism argument, and keep the first failure.
