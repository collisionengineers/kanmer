# Open questions — CORE-116

Nothing here is unresolved. Every entry below is a decision taken during
research with its alternative named, so a reviewer can overturn it cheaply.
None of them is a user-only question.

## Resolved

- [x] **Q1 — Does FRD-031 fit in one reviewable PR? No; split at goal.md's own
  seam.** The fixed product direction already separates *Phase 5 — configurable
  Git delivery policy* (`goal.md:467-524`) from *Phase 14 — release
  serialization and delivery state* (`goal.md:917-950`). The lane packet
  authorised a split with `blocks` if research showed one was needed, and named
  this exact seam.

  **Decision.** CORE-116 keeps Phase 5: the policy block and its resolver, the
  execution packet's base SHA / base branch / PR target / verification target,
  the merge-gate target check, per-ticket delivery state, and the hotfix
  backport record. [[CORE-132]] takes Phase 14: the release-channel lease,
  release-attempt records, immutable candidate identity, supersession,
  `RELEASE_CHANNEL_HELD`, the bounded retry schedule, and the
  `ReconciliationEvidence.release.state` wiring. CORE-116 blocks CORE-132;
  both block [[SKILL-036]] and [[CORE-119]]. FRD-031 is **not** edited.

  **FRD-031 acceptance split.** CORE-116: AC1 in full; AC5 in full; AC2 except
  its immutable-candidate clause; the edge case *"release evidence never turns
  an unmerged feature branch into a verified ticket"*. CORE-132: AC2's candidate
  clause, AC3, AC4, and the unavailable-release-service edge case.

  **Alternative rejected.** Keeping AC3/AC4 here and deferring only the retry
  schedule — rejected because the release-channel lease is a second persisted
  ownership artefact with its own on-disk format, its own error class and its
  own concurrency tests; bundling it roughly doubles the diff and puts two
  independent failure surfaces in one review.

- [x] **Q2 — Where does the delivery policy live: `board.yml` or a sidecar?
  `board.yml`.** `packages/core/src/project.ts:5-19` records that CORE-114
  deliberately put logical identity in `.kanmer/project.json` because
  *"`board.yml` is re-serialised through a key-stripping schema by every board
  write (an older server would silently drop an identity stored there)"* — and
  ADR-0021 keeps a **stable v0.3.12** server on the live board throughout
  candidate work. Confirmed empirically: the installed stable bundle has zero
  hits for `claimExpiryMinutes` / `leaseHeartbeatMinutes`, so it would already
  strip CORE-115's board-level lease knobs on a whole-board save.

  **Decision.** `board.yml`, as a `delivery:` block sibling to `deployment:`
  (`types.ts:379`), with camelCase keys matching board.yml convention
  (`goal.md:474-486` says "policy equivalent to", so its snake_case sketch is
  illustrative, not binding). Three things make the residual risk acceptable:
  (1) FRD-031 forbids giving Kanmer's own board a non-default policy, so the
  only board a stable server serves carries no block at all; (2) the default —
  absent block ⇒ main-only — is the safe direction; (3) the failure is loud, not
  silent: `get_status` reports whether the policy came from the board or the
  default, and the new merge-gate target check fails the very next PR that
  starts targeting the wrong branch.

  **Alternative rejected.** A `.kanmer/delivery.json` sidecar (or extending
  `ProjectRecord`) — safe from stripping, but it adds a third config file, hides
  policy from the GUI Settings editor where an operator would look for it, and
  conflates configuration with identity. Reviewer may overturn: the change is
  confined to the resolver's read path.

- [x] **Q3 — Do the delivery targets go on the step packet? No.**
  `STEP_PACKET_VERSION = "step-packet/1"` (`step-packet.ts:26`) must be bumped
  for any shape change, and `packetId` is a SHA-256 over `canonicalJson(body)`
  (`:169-179, 250`), so every packet id would change.

  **Decision.** The delivery block goes on `ExecutionPacketReady`
  (`execution-packet.ts:123-151`). `step` is an optional field *on* that same
  object (`:150-151`), so a worker holding a step packet already holds the
  targets; branch targets are ticket-scoped, not step-scoped; `step-packet/1`
  stands and no packet id changes. Revisit only if CORE-132 needs per-step
  release material.

- [x] **Q4 — What does `EndpointEntry.policy` mean?**
  `packages/mcp-server/src/project-registry.ts:32-33` reserves it for this
  ticket. **Decision:** it stays a free-text operator label naming the delivery
  policy the project's own board declares (`main-only`, `dev-to-main`, …),
  documented and echoed back, never validated and never used to choose a branch
  — the authority is always the project's own board. Doc-only; no registry
  behaviour change, so the MCP-054 surface is untouched.

- [x] **Q5 — Is the `"on merged main"` dispatch prompt in scope?**
  `packages/core/src/prompts.ts:150` and its feasibility reason at `:234-237`
  hardcode `main`, which goal.md:469-470 explicitly calls out. **Decision:**
  in scope but droppable — widen `DispatchTask.prompt` to
  `(id, verificationTarget?)` and pass the resolved target from the one caller
  that has a board (`packages/mcp-server/src/index.ts:994`). The GUI's two
  preview call sites (`apps/gui/src/main/index.ts:1357, 1362`) keep the default,
  so no GUI change. If it grows beyond that, drop it and record the residual —
  dispatch is disabled by operator policy on this board, so nothing is blocked
  either way.

- [x] **Q6 — Does this need a board format bump? No.**
  Optional additive config has repeatedly landed without one (`sources`,
  `repoDocs`, the three lease keys); defaults resolve at read, stated as
  doctrine at `migrate.ts:498-500`; and `migrateBoard` short-circuits a format-3
  board (`:567-570`). If a *written* default were ever needed on existing
  boards, the pattern is a fourth format-independent step beside
  `migrateIdentity()` (`migrate.ts:826-839`) — not a bump. Part one needs
  neither.

- [x] **Q7 — A new MCP tool for delivery state? No.**
  goal.md's NO-CHURN rule and HZN-008's non-goals forbid narrow workflow tools,
  and `smoke.mjs:69` asserts the roster is exactly 39. **Decision:** delivery
  state is written through `update_item`, validated store-side by an
  `assertDeliveryAgainstBoard` modelled on `assertDeploymentAgainstBoard`
  (`store.ts:2554-2572`), with `""` as the clear sentinel. Roster stays 39.

## Parked (explicitly deferred)

- GUI editing of the `delivery:` block in Settings — the block round-trips
  untouched today; an editor belongs with the GUI lane after this lands.
- Rewriting `kanmer-verify` / `kanmer-review` / `kanmer-closeout` prose to read
  the verification target from the packet — SKILL-036's lane. This ticket
  updates only `kanmer-execute`, which is where the base branch and PR target
  are actually chosen.
- `scripts/release*.mjs` and `.github/workflows/*.yml` — Kanmer's own repository
  and publishing policy, which FRD-031 forbids changing to demonstrate another
  policy.
