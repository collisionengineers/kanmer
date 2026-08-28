# Open questions — CORE-132

Every entry above the parked section is a decision taken during research with
its alternative named, so a reviewer can overturn it cheaply.

## Resolved

- [x] **Q1 — Does this need a new MCP tool? Yes, exactly one: `release_channel`.**
  The roster is **40** (`smoke.mjs:69`), and adding one costs nine sites
  (`research` F-10). I surveyed the existing surfaces first: every id-taking
  tool is ticket-, group- or column-scoped, `take_ticket` pins `id` to a ticket
  id, and AGENTS.md §8 item 16 records that smoke asserts **no** tool schema may
  grow a `root`/`boardRoot`/path field — so nothing existing can host a
  board-scoped channel without lying about its `id`.

  **Decision.** One **write** tool, `release_channel`, with a fixed `action`
  enum — `acquire` | `renew` | `record` | `supersede` | `complete` | `fail` —
  the same shape `take_ticket` uses for the ticket-lease surface. The **read**
  side costs nothing: `get_status.release` beside `get_status.delivery`
  (`index.ts:740`). Roster 40 → 41.

  **Why this is not NO-CHURN churn.** goal.md's rule forbids *many narrow*
  workflow tools; this is one action-based tool for an entire FRD phase, and it
  is the minimum that keeps the ticket from being a stub (AGENTS.md §8 item 18:
  without a write surface, `release.state` would be `not-applicable` forever and
  the collector wiring would be unreachable).

  **Alternative rejected.** Ship only the core/store API plus the collector, and
  defer the tool to CORE-119 — rejected because it presents an unreachable code
  path as an implementation, and CORE-119 is a *proof* ticket, not a place to
  grow the control surface.

- [x] **Q2 — Where do the release records live? `.kanmer/releases/`, a sidecar.**
  `board.yml` is re-serialised through a key-stripping schema by every board
  write (`project.ts:5-19`), and ADR-0021 keeps a **stable v0.3.12** server on
  the live board throughout candidate work — so a lease stored there could be
  silently dropped by a GUI Settings save. The item scan walks `.kanmer/areas/`
  only (`store.ts:580, 671`), so a sibling folder is invisible rather than a
  warning. The board branch already gitignores `.kanmer/**/*.lock`.

  **Decision.** `.kanmer/releases/channels/<channel>.json` (the mutable lease)
  and `.kanmer/releases/attempts/<attempt_id>.json` (the attempt records).
  Channel names go through the same traversal guard item ids do
  (`paths.ts:239-249`).

  **Alternative rejected.** A `delivery.channels` block in `board.yml` — it is
  exactly the exposure the ticket's own constraint ("keep the release lease out
  of `board.yml`") forbids.

- [x] **Q3 — Which terminal outcomes clear the channel lease?**
  FRD-031 AC4 names "a successful **or superseded** terminal attempt"; goal.md
  adds "failed immutable attempts retain their proof" and says nothing about a
  failed attempt's lease.

  **Decision.** `complete` (outcome `released`) clears the lease.
  `supersede` archives the incumbent with a `successor` and hands the lease to
  the successor attempt. `fail` is terminal, retains its proof, and **keeps**
  the channel — so a second owner cannot start a release on top of unexamined
  failure evidence. Its lease still expires on the ordinary renewable rule, and
  the documented way out is an explicit `supersede`. HZN-008's Definition of
  done ("the release-channel lease is clear") stays reachable on every path.

  **Alternative rejected.** Clearing on failure too — simpler, but it silently
  discards the serialization guarantee at exactly the moment it matters.

- [x] **Q4 — Is an expired release lease retaken, or reclaimed?** Reclaimed.
  `takeTicket`'s own refusal message states the doctrine — "An expired lease is
  reclaimed with `take_ticket` action `transfer`, never retaken"
  (`store.ts:1404-1419`) — and `assertWorkspaceFree` (`:1233-1262`) deliberately
  ignores expiry so an expired-but-unreleased lease still owns its resource.

  **Decision.** `acquire` refuses `RELEASE_CHANNEL_HELD` whenever a channel
  record exists, live **or** expired, naming the expiry in the message. The
  reclaim is `supersede`, which is also the AC3 remediation path. One verb, one
  ownership model, and FRD-031's "a superseded attempt is archived with
  successor" stays literally true.

- [x] **Q5 — What is a candidate identity, and how is AC3 enforced?**
  **Decision.** `candidate_id = cand1:<16 hex>` digested over
  `{channel, integrationSha, ordinal}`, mirroring `computeRevision`'s `rev1:`
  idiom (`project.ts:139-155`); `candidate_ref =
  releaseCandidatePattern.replace("*", "<channel>-<ordinal>")` when the policy
  declares a pattern (Phase 5 rule 6's "immutable candidate ref or branch"),
  else `null`. `attempt_id`, `channel`, `candidate_id`, `candidate_ref`,
  `integration_sha` and `created_at` are frozen at mint; a write that would
  change one is refused, and a terminal attempt is frozen entirely. A successor
  minted by `supersede` starts with **empty** verification and artifact
  evidence — that is "evidence for candidate 1 does not carry to candidate 2".
  Because the digest includes the SHA, a changed SHA *provably* yields a
  different identity, which is AC3.

- [x] **Q6 — Where is the lock/network seam?** Exactly where CORE-131 put its
  own (`mcp-server/src/reconciliation.ts:400-470`), and for the reason
  AGENTS.md §8 item 17 gives: "nothing slow, networked or git-shaped belongs
  inside it."

  **Decision.** `collect (unlocked, MCP boundary) → verb (locked, store)`. The
  MCP handler resolves the integration SHA with a bounded `git rev-parse` and
  takes the caller's release-service observation *before* entering the store;
  each store verb then runs wholly inside `withLeaseLock` doing read → CAS →
  atomic write, with no subprocess and no network. The `reconcile_ticket`
  collector reads the release records with plain `fs` reads outside any lock,
  like every other evidence read.

- [x] **Q7 — Does the release channel need board format 4, or a `board.yml`
  block? No to both.** Additive sidecar; defaults resolved at read
  (`migrate.ts:498-500` doctrine); `migrateBoard` short-circuits a format-3
  board. The channel *name* defaults to the resolved `releaseBranch`
  (`resolveDelivery`), so a project that declares nothing still has exactly one
  well-named channel and needs no new configuration.

- [x] **Q8 — Does this change Kanmer's own delivery policy or publishing rail?
  No.** FRD-031 forbids changing Kanmer's own repository policy to demonstrate
  another. Kanmer's board declares no `delivery:` block, holds no release
  channel, and `scripts/release*.mjs` / `.github/workflows/*` are untouched.
  On this board every ticket's `release.state` therefore stays
  `not-applicable` — which is the regression that proves the collector is
  neutral by default.

- [x] **Q9 — Does `release_channel` need to be operator-gated like
  `dispatch_task`? No.** Dispatch is gated because it *spawns a child process*.
  Every release verb writes only board records under `.kanmer/releases/`; it
  publishes nothing, pushes nothing and spawns nothing. The serialization
  guarantee **is** the lease, so gating would add a second ownership model —
  which HZN-008's constraints forbid.

- [x] **Q10 — Does fixing F-001 risk a second definition of "hotfix"? No.**
  `deliveryTargets` (`board.ts:260-267`) stays the only one, keyed on a
  *recorded* `delivery_branch`, never a branch-name heuristic — the doc comment
  at `:255-259` states why. The fix at `index.ts:1082-1084` calls it with the
  `item` already in scope at `:1059`; `prompts.ts:159-160` already accepts a
  verification target, so core is unchanged.

## Parked (explicitly deferred)

- **Who may hold a release channel — any controller, or an operator only?**
  This is an authority question, not an implementation choice: acquiring the
  channel is what decides that a release is under way for a project, and a
  project might reasonably want that to be a human decision.

  **Recommendation, implemented as the default so nothing is blocked:** any
  caller may `acquire`, and the lease itself is the serialization. Rationale —
  the verbs write only board records, publish nothing and spawn nothing (Q9);
  `RELEASE_CHANNEL_HELD` already makes a second concurrent owner impossible;
  and an operator who wants a stricter rule has the ordinary MCP-level controls
  without Kanmer growing a second ownership model. If the operator decides
  otherwise, the change is confined to one guard in the `acquire` handler.

- **GUI surfacing of the channel and its attempts** — `get_status.release` is
  the read a GUI would consume; the panel belongs with the GUI lane after this
  lands.

- **Driving Kanmer's own `scripts/release*.mjs` publishing rail through a
  release channel** — that rail publishes the app, not board delivery state, and
  FRD-031 forbids changing Kanmer's own policy to demonstrate another.
