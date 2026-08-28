# Research — CORE-132: release-channel leases and immutable candidate identity

Read at `origin/main` `70d23efd` (fetched 2026-08-28). CORE-116 (the first half
of FRD-031) is merged at `28a12643`; its `research/`, `files/` and
`open-questions/` are the starting point and are **not** re-derived here. This
document records only what is new for the second half.

## Question

FRD-031 AC2 (immutable-candidate clause), AC3, AC4 and the
unavailable-release-service edge case need a **second persisted ownership
artefact**: a release-channel lease and an immutable release-attempt record.
Where does it live on disk, what verbs does it need, what MCP surface exposes
them, and where exactly does the lock/network seam go?

## Findings

### F-01 — the release channel has no ticket to hang off, so it needs its own record

CORE-115's lease is **ticket frontmatter** (`lease_id`, `lease_revision`,
`lease_workspace`, `lease_phase`, `lease_heartbeat_at`, … —
`types.ts:434-479`), serialised by the private board-wide `withLeaseLock` over
`.kanmer/leases.lock` (`store.ts:1177-1197`), re-entrant only within one async
execution context via a module-level `AsyncLocalStorage`. Verbs: `takeTicket`
`:1365`, `releaseTicket`, `transferTicket`, `renewTicket`.

A release channel is owned by a **release attempt**, not by a workspace and not
by a ticket. So the reuse is the **mechanism** — the same `withLeaseLock`
critical section, the same read-inside-the-lock revision CAS, the same
renewable-expiry rule from `leaseState()`/`leaseConfig()` (`types.ts:960-991`,
`:940-951`) — and **not** the ticket-scoped record. CORE-116's own research
reached the same conclusion (its F-07) and explicitly told part one not to
pre-empt the file format.

`assertWorkspaceFree` (`store.ts:1233-1262`) deliberately ignores expiry: an
expired-but-unreleased lease still owns its workspace and `force` does not
bypass it. The release lease must keep that invariant or it becomes the bypass.

### F-02 — `.kanmer/project.json` is the precedent for a sidecar, and the item scan cannot see one

`packages/core/src/project.ts:5-19` states the rule outright: `board.yml` is
re-serialised through a key-stripping schema by every board write, so an older
server silently drops anything it does not know; `.kanmer/project.json` is its
own file for exactly that reason, and a pre-identity server never reads or
writes it.

The item scan is `fs.readdir(this.paths.areasRoot)` (`store.ts:580, 671`) — it
walks `.kanmer/areas/` only. A new `.kanmer/releases/` folder is therefore
invisible to v0.3.12: not stripped, not warned about, not listed. The board
branch already gitignores `.kanmer/**/*.lock` (board worktree `.gitignore`
lines 3-6), so a lock file beside the records is not committed while the
records themselves are.

**Implication.** Release records go in `.kanmer/releases/`, never in
`board.yml` and never under `areas/`. That satisfies the ticket's stated
constraint that v0.3.12 can still read the board.

### F-03 — the consumer of `release.state` is complete; only the producer is missing

`packages/core/src/reconciliation.ts` (whole-file read at `70d23efd`) routes
every non-neutral value already:

- `:76-79` — `contended` or `superseded` is a **hard refusal** emitting
  `RELEASE_EVIDENCE_PRESERVED` (warning), ordered ahead of every other rule but
  the board-worktree guard (`:49-58` documents the ordering).
- `:80-91` — `unavailable` joins the `EVIDENCE_INCONCLUSIVE` refusal set with
  the PR/commit/workspace unavailables.
- `:22-32` — `stableEvidence()` copies `release` whole, so a widened shape
  survives.

`packages/mcp-server/src/reconciliation.ts:305-313` is the only stub, and its
comment forbids manufacturing a neutral observation for evidence it cannot
inspect. `ReconciliationEvidence.release` is `types.ts:1085-1093`.

**Implication.** The four values already carry meaning; the collector's whole
job is to map persisted attempts onto them, and a record it cannot read must be
`unavailable`, never `not-applicable`.

Mapping chosen (each state already has a consumer behaviour that fits):

| Observation for ticket *T* | `release.state` | Why it fits the existing consumer |
|---|---|---|
| No release records, or no attempt includes *T* | `not-applicable` | Neutral — the normal case, and Kanmer's own board |
| The attempt including *T* is terminal `superseded` | `superseded` | Preserve immutable evidence, recommend nothing |
| *T* is in more than one non-terminal attempt, or in a non-terminal attempt that is not the channel's current holder | `contended` | Same refusal; ownership is genuinely ambiguous |
| The attempt including *T* has a live bounded retry schedule, or a record cannot be read/parsed | `unavailable` | `EVIDENCE_INCONCLUSIVE` — do not invent a recovery |

### F-04 — CORE-131 already drew the collect/apply seam this ticket must copy

`packages/mcp-server/src/reconciliation.ts:400-410` (`reconcileTicket`) and
`:424-470` (`applyReconciliation`) place the seam explicitly. `applyReconciliation`'s
own doc comment says step 1 "spawns git/gh and **therefore runs outside every
lock**", then step 5 delegates to `store.applyReconciliation`, "which re-checks
preconditions and passes `expectedRevision` into the locked verb".

AGENTS.md §8 item 17 is the rule behind it: "Keep the section tight … nothing
slow, networked or git-shaped belongs inside it", and "Any new ticket-file
writer belongs inside it too."

**Implication — the seam for this ticket.** Every release verb is
`collect (unlocked, at the MCP boundary) → verb (locked, in the store)`:

- the MCP handler resolves the integration SHA with a bounded `git rev-parse`
  (the `gitOptions` `timeout`/`maxBuffer` convention at
  `mcp-server/src/reconciliation.ts`) and takes the caller's release-service
  observation, **before** entering the store;
- `store.acquireReleaseChannel` / `renew` / `record` / `supersede` / `complete`
  each run wholly inside `withLeaseLock`, doing read → CAS → atomic write with
  no subprocess and no network;
- the `reconcile_ticket` collector reads the release records with plain `fs`
  reads outside any lock, like every other evidence read.

### F-05 — `RELEASE_CHANNEL_HELD` is named in the approved direction, and the classifier is a prefix table

`goal.md:1084` lists `RELEASE_CHANNEL_HELD` in the structured-error set.
`packages/mcp-server/src/errors.ts:1-33` classifies by **message prefix**:
`LEASE_CONFLICT_PREFIXES` is a literal list and `KanmerErrorCode` is a union.
CORE-131 added two codes to that union the same way.

**Implication.** Core throws `RELEASE_CHANNEL_HELD: …` as an ordinary `Error`
with that prefix; the MCP boundary adds `"RELEASE_CHANNEL_HELD"` to
`KanmerErrorCode` and one prefix entry. No new error machinery.

### F-06 — goal.md Phase 14 is the field list; Phase 5 rules 6-8 are the rules

`goal.md:917-950`. A release attempt records channel, integration SHA,
candidate identity, release branch/tag, included PRs, included tickets,
artifact manifest, verification state, and successor when superseded. Rules:
one active release per channel; release review uses an immutable candidate;
evidence for candidate 1 does not carry to candidate 2; failed immutable
attempts retain their proof; a superseded attempt is archived with successor;
a successful release clears the channel lease; ordinary feature tickets do not
sit in Verifying waiting for a release, and `delivery_state` tracks inclusion
separately (already shipped by CORE-116).

Phase 5 rules 6-8 (`goal.md:513-521`) say the same three things in short form:
an immutable candidate ref/branch when the policy enables candidates,
remediation mints a *new* candidate identity rather than reusing changed-SHA
evidence, and one active release lease per channel. The CORE-116 review was
right that the seam is not pre-drawn; the content is nevertheless unambiguous.

### F-07 — the channel identity and the candidate identity

`resolveDelivery(board)` (`board.ts:229-237`) already decides
`releaseBranch` and `releaseCandidatePattern` (null when candidates are not
enabled), and `assertDeliveryPolicy` (`board.ts:279-296`) already requires a
pattern to contain `*`.

- **Channel** = a caller-supplied id defaulting to the resolved `releaseBranch`.
  Validated with the existing `assertSafeId`/`areaFolderName`-shaped guard
  (`paths.ts:239-249`) so it is safe to embed in a filename.
- **Candidate identity** = `cand1:<16 hex>` over `{channel, integrationSha,
  ordinal}`, mirroring `computeRevision`'s `rev1:` prefix idiom
  (`project.ts:139-155`). Deterministic and *provably* different when the
  integration SHA changes — which is precisely AC3.
- **Candidate ref** = `releaseCandidatePattern.replace("*", "<channel>-<ordinal>")`
  when the policy declares a pattern; `null` when candidates are not enabled.
  That is Phase 5 rule 6's "immutable candidate ref or branch".

Immutability is enforced as: `attempt_id`, `channel`, `candidate_id`,
`candidate_ref`, `integration_sha` and `created_at` are frozen at mint and any
write that would change one is refused; a terminal attempt is frozen entirely.
Progress fields (verification state, artifact manifest, included PRs/tickets,
release branch/tag, retry schedule) are recorded while the attempt is live. A
successor attempt starts with **empty** evidence — that is "evidence for
candidate 1 does not carry to candidate 2".

### F-08 — an expired release lease is reclaimed, never retaken

`takeTicket` (`store.ts:1404-1419`) refuses `LEASE_LIVE` and its message states
the doctrine: "An expired lease is reclaimed with `take_ticket` action
`transfer`, never retaken." AGENTS.md §8 item 17 repeats it.

**Implication.** `acquire` refuses `RELEASE_CHANNEL_HELD` whenever a channel
record exists — live *or* expired — and names the expiry in the message. The
reclaim is `supersede`, which archives the incumbent attempt with a
`successor`, mints the successor at a (possibly new) integration SHA with a new
candidate identity and empty evidence, and hands the lease over. That is one
verb serving both remediation (AC3) and abandoned-lease reclaim, and it keeps
FRD-031's "a superseded attempt is archived with successor" literally true.

### F-09 — which terminal outcomes clear the lease

FRD-031 AC4: "a **successful or superseded** terminal attempt clears the lease
appropriately." goal.md: "failed immutable attempts retain their proof."
Neither says a *failed* attempt clears the channel.

**Decision (see `open-questions` Q3).** `complete` (outcome `released`) clears
the lease; `supersede` moves it to the successor; `fail` (outcome `failed`)
is terminal, retains its proof, and **keeps** the channel — so a second owner
cannot start a release on top of unexamined failure evidence. Its lease still
expires on the ordinary renewable rule, and the way out is an explicit
`supersede`. HZN-008's Definition of done ("the release-channel lease is
clear") is reachable in every path.

### F-10 — the roster is 40 and a new tool costs nine sites

`smoke.mjs:69` (`tools.tools.length === 40`) and its name list `:70-86`;
`smoke-protocol.mjs:160` (message) and `:161` (predicate);
`AGENTS.md:435` (§4) and `AGENTS.md:660` (§8 item 19's parenthetical "the
roster moved to 40 only when CORE-131 added `apply_reconciliation`");
`docs/manual/connect.md:145`; `chapters.generated.ts` via `npm run build:manual`;
`plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md`; and the
re-committed `plugins/kanmer/mcp/kanmer-mcp.cjs` that `plugin:check`
byte-compares.

Surveyed for an existing home: every id-taking tool is ticket-, group- or
column-scoped (`take_ticket` pins `id` to a ticket id, and smoke asserts no
tool schema grows a path field — AGENTS.md §8 item 16), so none can host a
board-scoped channel. `get_status` **can** host the read side for free.

**Decision (`open-questions` Q1).** Add exactly one write tool,
`release_channel`, with a fixed `action` enum — the same shape `take_ticket`
uses for the ticket-lease surface — and put the read side on `get_status.release`
at no roster cost. Roster 40 → 41, nine sites updated. goal.md's NO-CHURN rule
forbids *many narrow* workflow tools, which one action-based tool is not.

### F-11 — the carried-in defect is a two-line fix with `item` already in scope

`packages/mcp-server/src/index.ts:1082-1084`:

```ts
// FRD-031: the verify prompt names this project's integration branch, not
// a hardcoded `main`.
const verificationTarget = resolveDelivery(await store.getBoard()).integrationBranch;
```

`const item = await store.getItem(ticket_id)` is already in scope at `:1059`,
and `deliveryTargets(policy, item)` (`board.ts:260-267`) takes exactly
`{ delivery_branch?: string }`. So the fix is to resolve the policy, call
`deliveryTargets`, and take `.verificationTarget` — adding `deliveryTargets` to
the existing `resolveDelivery` import. No second definition of "hotfix" is
introduced; `deliveryTargets` remains the only one, keyed on a *recorded*
`delivery_branch` (`board.ts:255-259` states why a branch **name** proves
nothing).

`prompts.ts:159-160` already takes `(id, verificationTarget)`, so nothing in
core changes for this.

### F-12 — test conventions and the file-ownership constraint still bind

Core tests are vitest, serial (AGENTS.md §6). `claims.test.ts` is the model:
`mkdtemp` root, `new KanmerStore(root, { actor })`, a gate-free
`{ type: "ticket", profile: "custom", requires: {} }` fixture, concurrency
proved by parking a second store inside the critical section. MCP `.mjs` tests
use `node:test`.

CORE-128 owns `io.test.ts`, `docs.test.ts`, `migrate.test.ts`, `store.test.ts`
and `scripts/antigravity-plugin-config.test.mjs` — new tests go in **new**
files. The 5s-timeout / `ENOTEMPTY` flake class in
`claims.test.ts`/`docs.test.ts`/`store.test.ts` reaches hosted CI too (HZN-008
`context.md`), so a red run is discharged with a same-SHA re-run, a
diff-untouched confirmation and a mechanism argument — never with an assertion.

`npm run verify` currently exits 1 on `antigravity-plugin-config.test.mjs`
(Windows `EBUSY` ×2), CORE-128's active lane; the rail is fail-fast, so every
step it skips is run individually.

## Implications for this ticket

1. **New on-disk artefact under `.kanmer/releases/`**, not `board.yml`, not
   `areas/`: `channels/<channel>.json` (the mutable lease) and
   `attempts/<attempt_id>.json` (the attempt records). Invisible to v0.3.12.
2. **Reuse `withLeaseLock`**, the board write lock, for every release verb.
   Read → CAS → atomic write inside it; git and the release-service observation
   collected outside it at the MCP boundary, exactly as CORE-131 does.
3. **One new tool** (`release_channel`, action-based) plus a free
   `get_status.release` read; roster 40 → 41 across the nine sites.
4. **`RELEASE_CHANNEL_HELD`** is a message prefix in core and one entry in the
   MCP `KanmerErrorCode` union and prefix table.
5. **The collector maps attempts onto the four existing `release.state`
   values**; an unreadable record is `unavailable`, never `not-applicable`.
6. **F-001 is fixed by routing `dispatch_task` through `deliveryTargets`**, with
   no second definition of "hotfix".
7. **No board format bump** — additive sidecar, defaults resolved at read
   (`migrate.ts:498-500` doctrine); nothing in `gates.ts`/`profiles.ts` reads a
   release record, so release evidence stays non-gating (ADR-0005, and FRD-031's
   "release evidence never turns an unmerged feature branch into a verified
   ticket" — CORE-116's regression test for that must keep passing).
