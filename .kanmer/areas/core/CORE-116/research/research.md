# Research — CORE-116: configurable Git delivery policy, delivery state, release-channel leases

Read at `origin/main` `bf0eaed4` in `.worktrees/core-116`.

## Question

FRD-031 asks for four things that are usually conflated: (a) a **per-project Git
delivery policy**, (b) **delivery state kept separate from the workflow stage**,
(c) **immutable release-candidate identity**, and (d) **one release lease per
release channel**. What already exists in this repo for each, what is reserved
for this ticket by name, and does the whole of FRD-031 fit in one reviewable PR?

## Findings

### F-01 — goal.md splits this work into two approved phases, and so should we

`goal.md` (the fixed product direction the horizon implements) states the same
material as **Phase 5 — Configurable Git delivery policy** (`goal.md:467-524`:
the `git:` block, PR targeting, execution-packet targets, `delivery_state`, the
backport rule, and "do not switch the Kanmer repository itself to dev") and,
separately, **Phase 14 — Release serialization and delivery state**
(`goal.md:917-950`: one exclusive active release lease per channel, the release
*attempt* record with channel/integration SHA/candidate identity/branch+tag/
included PRs/tickets/artifact manifest/verification state/successor, evidence
not carrying from candidate 1 to candidate 2, failed attempts retaining proof,
superseded attempts archived with a successor, a successful release clearing the
lease). `RELEASE_CHANNEL_HELD` appears only in the structured-error list
(`goal.md:1084`).

**Implication.** The seam the packet suggested is the seam the approved
direction already draws. Phase 5 is the bounded first part; Phase 14 is the
second. Recommendation and disposition are in `open-questions`.

### F-02 — three places in the tree are reserved for this ticket by name

| Location | What it says |
|---|---|
| `packages/core/src/types.ts:931-934` | `ReconciliationEvidence.release = { state: "not-applicable" \| "superseded" \| "contended" \| "unavailable" }`, commented *"CORE-116 owns persisted release attempts; until then this is `not-applicable`."* |
| `packages/mcp-server/src/reconciliation.ts:311-313` | hard-codes `"not-applicable"`, with a comment forbidding a manufactured neutral observation. |
| `packages/mcp-server/src/project-registry.ts:32-33` | `EndpointEntry.policy?: string` — *"Operator-declared delivery policy label, echoed back; CORE-116 defines its semantics."* |

Every non-neutral value of `release.state` (`superseded`, `contended`,
`unavailable`) is a **release-attempt** concept — supersession, channel
contention, an unavailable release service. All three are Phase 14. So wiring
`reconcile_ticket`'s release block belongs with the release-lease part, not with
the policy part; the first part leaves it `not-applicable` and says so.
`project-registry.policy` is a free-text operator label with no reader; giving it
documented semantics ("the name of the delivery policy the project's own
board.yml declares") is a doc-only clarification and is cheap enough to keep in
part one.

### F-03 — nothing in the product hardcodes `main` as a PR or verification target

- `packages/core/src/merge-gate.ts` never mentions a branch name.
  `MergeGatePrInput` (`:16-21`) is `{ number, headSha, branch, body }` — it
  carries the **head** ref and no base ref at all.
- `packages/mcp-server/src/check-pr.mjs:31-39` parses the GitHub event and
  extracts `base.sha` **but discards `base.ref`**.
- `.github/workflows/pr.yml` does hardcode `main` (`:5, :14, :30, :106, :120`),
  but that is *Kanmer's own repository policy*, which FRD-031 explicitly forbids
  changing to demonstrate another policy. It stays.
- The only other hardcoding is skill prose:
  `plugins/kanmer/skills/kanmer-execute/SKILL.md:204`
  (`git worktree add … origin/main`) and `kanmer-verify/SKILL.md:45,48,70`.

**Implication.** "Normal implementation PRs target the configured integration
branch" is a genuinely *new* check, not a de-hardcoding exercise. The cheapest
faithful implementation is: add `baseRef` to `MergeGatePrInput`, add a
`WRONG_TARGET` finding code, have `check-pr.mjs` pass `pull_request.base.ref`
and the fetched board's resolved integration branch. Level should follow the
CORE-123 compatibility convention: warning by default, error under
`KANMER_GATE_STRICT`, so no existing repository's PRs start failing.

### F-04 — board.yml config is stripped by an older server; ticket frontmatter is not

`BoardConfigSchema` (`types.ts:365-393`) is a plain `z.object()`: zod **strips**
unknown keys on read and therefore drops them on the next write. The whole-board
save path is real — `apps/gui/src/main/index.ts:1221` → `store.setBoard(board)`.
`ItemFrontmatterSchema` (`types.ts:410-520`) ends in `.passthrough()`, so unknown
ticket frontmatter keys round-trip untouched.

Grepping the **installed stable** bundle
(`%LOCALAPPDATA%\Programs\Kanmer\resources\plugins\kanmer\mcp\kanmer-mcp.cjs`,
v0.3.12, sha256 `639df4cf`) returns **0 hits** for `claimExpiryMinutes`,
`leaseHeartbeatMinutes` and `reconcile_ticket`. So the stable server that serves
the live board would already drop CORE-115's board-level lease knobs if an
operator saved board settings from the stable GUI.

**Implication.** (1) Delivery **state** belongs on the ticket (`delivery_*`
frontmatter) — passthrough makes it stable-safe. (2) Delivery **policy** belongs
in `board.yml` under a `git:` block, accepting the same, already-precedented,
stripping exposure as CORE-115. (3) The exposure is nil in practice for this
repo because FRD-031 forbids giving Kanmer's own board a delivery policy at all —
the default (absent block) *is* Kanmer's current main-only policy. No format
bump: additive optional config plus additive optional frontmatter.

### F-05 — the resolver, status and packet patterns to copy exactly

- `leaseConfig(board)` (`types.ts:794-802`) turns three optional board keys into
  a fully-defaulted record; `resolveEnvironments` / `resolveProofTypes` /
  `resolveGroupKinds` (`board.ts:197-210`) are the same idea and live in
  `board.ts`. `resolveDeliveryPolicy(board)` belongs beside them in `board.ts`,
  with the schema in `types.ts`.
- `get_status` reports `leases: leaseConfig(board)` at
  `packages/mcp-server/src/index.ts:683` and `deploymentTracking` at `:684` —
  `delivery:` goes next to them.
- `ExecutionPacketReady` (`execution-packet.ts:123-152`) carries `project`,
  `ticket`, `claim`, `groupContexts`, `documents`, `gates`, `validation`,
  `stopCondition`, `commandsHint` — **and no branch target of any kind**. This
  is where FRD-031's "exact base SHA, base branch, PR target and verification
  target" must land. Core is git-free by rule (CORE-122 precedent), so the base
  **SHA** must be resolved at the MCP boundary with a bounded `git rev-parse`,
  reporting `unavailable` on failure — exactly how `reconciliation.ts` collects
  its evidence.

### F-06 — the per-ticket field precedent is `deployment`, not a new tool

`deployment` is already an optional ticket frontmatter string
(`types.ts:513-514`) validated against a board block by
`assertDeploymentAgainstBoard` (`store.ts:2554-2572`), set through the generic
`update_item` (`index.ts:1428-1432`), with `""` as the clear sentinel
(`store.ts:855, 2583-2584`). goal.md's NO-CHURN rule and HZN-008's non-goals both
forbid "many narrow workflow tools", and `smoke.mjs:69` asserts the roster is
literally **39 tools**.

**Implication.** Delivery state is recorded through `update_item` with a
store-side `assertDeliveryAgainstBoard`, not a new tool. Roster stays 39.

### F-07 — the lease substrate exists and is ticket-scoped; a release channel is board-scoped

CORE-115/CORE-124/CORE-125 put a full renewable lease on **ticket frontmatter**
(`lease_id`, `lease_revision`, `lease_workspace`, `lease_phase`,
`lease_heartbeat_at`, `lease_reclaimed_from`, `lease_batch*` —
`types.ts:434-479`, key order `frontmatter.ts:16-33`), serialised by a private
board-wide `withLeaseLock` over `.kanmer/leases.lock`
(`store.ts:1139-1168`, re-entrant via a module-level `AsyncLocalStorage` at
`store.ts:145`, built on `withExclusiveFileLock` at `io.ts:452`). Verbs:
`takeTicket` `:1331`, `releaseTicket` `:1458`, `transferTicket` `:1504`,
`renewTicket` `:1599`. Timing defaults 30/5/120 minutes (`types.ts:780-784`).
Error strings are message **prefixes** classified at the MCP boundary by
`errors.ts:1-25` into `LEASE_EXPIRED` / `LEASE_CONFLICT`.

A **release channel** lease has no ticket to hang off: it is owned by a release
attempt, not by a workspace. The right reuse is the *mechanism*, not the
*record* — take the same `withLeaseLock` critical section, the same
`lease_revision` CAS discipline, the same renewable-expiry rule and the same
`RECOVERY_REFUSED`-style evidence gate, and persist the channel record as a new
additive artefact under `.kanmer/` (the item scan only walks `.kanmer/areas/`,
so an extra file there is invisible to v0.3.12 rather than a warning). That
satisfies HZN-008's "reuse it rather than inventing a parallel ownership model"
without pretending a channel is a workspace. **This is part-two work**; part one
must not pre-empt its file format.

Note `assertWorkspaceFree` (`store.ts:1187-1216`) deliberately ignores expiry —
an expired-but-unreleased lease still owns its workspace, and `force` does not
bypass it. Any release-lease design must keep that invariant, or it becomes the
bypass.

### F-08 — the "unmerged branch" edge case is satisfied by construction, and must be tested

FRD-031's edge case *"release evidence never turns an unmerged feature branch
into a verified ticket"* holds automatically because delivery state is not a
gate input: `enter-done` requires `proof` (`get_doc_gates CORE-116`), and the
gate engine reads only doc types. The risk is a future change wiring delivery
state into gates. It therefore needs an explicit regression test: recording
`delivery_state: released` must **not** let `move_item … done` pass without
`proof`.

### F-09 — test conventions

Core tests are vitest and run serially (`AGENTS.md §6`). `claims.test.ts` is the
model: `mkdtemp` root in `beforeEach`, `new KanmerStore(root, { actor })`,
`ticketFile(id)` helper resolving `.kanmer/areas/_none/<id>/<id>.md`, a
gate-free `free = { type: "ticket", profile: "custom", requires: {} }` fixture
for walking stages, and concurrency proved by parking a second `KanmerStore`
inside the critical section. MCP-side `.mjs` tests use `node:test`. The
authoritative rail is `scripts/verify.mjs`'s 12 `VERIFY_STEPS`.

**Concurrency constraint for this lane:** CORE-128 owns `io.test.ts`,
`docs.test.ts`, `migrate.test.ts`, `store.test.ts` and
`scripts/antigravity-plugin-config.test.mjs`. New tests go in **new** files
(`packages/core/src/delivery.test.ts`, `packages/mcp-server/src/delivery.test.mjs`).

## Implications for this ticket

1. **Split.** Part one = goal.md Phase 5: the `git:` policy block, its resolver
   and defaults, `delivery_*` ticket state with validation, execution-packet
   targets, the merge-gate target check, `get_status.delivery`, and the
   "delivery state is not a gate" regression. Part two = goal.md Phase 14:
   release-channel lease, release-attempt records, immutable candidate identity,
   supersession, `RELEASE_CHANNEL_HELD`, bounded retry schedule, and the
   `reconcile_ticket` `release.state` wiring. See `open-questions` Q1.
2. **FRD-031 acceptance coverage of part one:** AC1 in full; AC5 in full (the
   backport *record*, driven by the `hotfixBackport` policy); AC2 except the
   immutable-candidate clause; both edge cases except the release-service retry.
   AC3 and AC4 are part two. Nothing in FRD-031 is edited.
3. **No format bump, no new tool, roster stays 39, no change to Kanmer's own
   delivery policy** (its board gets no `git:` block; the default *is* its
   current policy).
4. **Core stays git-free**; the base SHA is resolved at the MCP boundary with a
   bounded subprocess and degrades to `unavailable`.

---

## Addendum — surfaces swept in detail

### F-10 — the *consumer* of `release.state` already exists; only the producer is stubbed

`packages/core/src/reconciliation.ts` already routes every non-neutral release
state:

- `:58-61` — `contended` or `superseded` is a **hard refusal** that emits
  `RELEASE_EVIDENCE_PRESERVED` (warning) and recommends nothing, ahead of every
  other rule (`:37` documents the ordering).
- `:62-71` — `unavailable` joins the `EVIDENCE_INCONCLUSIVE` refusal set.
- `:25` — `stableEvidence()` copies `release` whole, so a widened shape survives.

Tests already cover all three (`reconciliation.test.ts:23, 49, 109, 139`;
`smoke.mjs:3048`). This confirms F-02: part one changes nothing here, and part
two only has to make the collector observe real attempts.

Beware the false friend: `RELEASE_CLEAN_TERMINAL_CLAIM`
(`types.ts:948`, `reconciliation.ts:142`) and every `release` in `store.ts` /
`activity.ts` / `io.ts` mean **claim/lock release**, not software release.

### F-11 — `project.json` is the in-repo precedent *against* board.yml, and why we still choose board.yml

`packages/core/src/project.ts:5-19` says outright that CORE-114 put logical
identity in its own `.kanmer/project.json` because *"`board.yml` is
re-serialised through a key-stripping schema by every board write (an older
server would silently drop an identity stored there)"*. `readProjectRecord`
(`project.ts:48-70`) also reconstructs from known fields, so it is lossy for
unknown keys too — but the stable v0.3.12 server never reads or writes
`project.json` at all, whereas it does read and rewrite `board.yml`.

Weighed:

- **For a sidecar:** silently losing `integrationBranch: dev` is a correctness
  failure, not tuning drift; HZN-008 explicitly contemplates two hosts on one
  board running different server builds.
- **For board.yml:** it is where every other per-project setting lives
  (`deployment`, `sources`, `profiles`, lease timings); goal.md:474-486
  illustrates the policy as board configuration; the GUI Settings editor is the
  place an operator would look; and CORE-115 already accepted the same exposure
  for `claimExpiryMinutes`/`leaseHeartbeatMinutes`.
- **The decisive mitigation:** the failure is not silent. The default is
  main-only, `get_status` can report whether the policy came from the board or
  the default, and the new merge-gate target check makes a PR that starts
  targeting the wrong branch *fail loudly on the very next PR*.

Decision recorded in `open-questions` Q2: **board.yml**, sibling of
`deployment:`, with `source: "board" | "default"` reported by `get_status` and
the merge-gate check as the backstop.

### F-12 — no format bump; a format-independent migration step exists if one is ever needed

`CURRENT_FORMAT = 3` (`version.ts:14`); `migrateBoard` short-circuits a format-3
board (`migrate.ts:567-570`). Optional additive config has repeatedly landed
without a bump (`sources`, `repoDocs`, the three lease keys), and defaults are
resolved at read, never materialised — stated as doctrine at `migrate.ts:498-500`.
If a *written* default were ever required on existing boards, the pattern is a
fourth format-independent step beside `migrateIdentity()`
(`migrate.ts:826-839`, wired at `:799-809`, explained at `:821-825`) — **not** a
format bump. Part one needs neither: absent block ⇒ main-only.

Note `migrate.ts:724-728` writes the literal `format: 3` rather than
`CURRENT_FORMAT`; irrelevant here, worth knowing if a bump ever happens.

### F-13 — the step packet must NOT be bumped; the whole-ticket packet is the right home

`STEP_PACKET_VERSION = "step-packet/1"` (`step-packet.ts:26`) with an explicit
*"bump when its shape changes"*, and `packetId` is a SHA-256 over
`canonicalJson(body)` (`step-packet.ts:169-179, 250`) — so any added field
changes **every** packet id. `StepPacketWorkspace` (`step-packet.ts:57-61`) is
`{ branch, worktree }` only, populated from the ticket's claim at
`execution-packet.ts:648`; it describes *where work happens*, not what it
targets.

Since `step` is an optional field **on** `ExecutionPacketReady`
(`execution-packet.ts:150-151`), a worker holding a step packet already holds the
whole-ticket packet. So the delivery block goes on `ExecutionPacketReady`, the
step packet is untouched and `step-packet/1` stands. Decision in
`open-questions` Q3.

### F-14 — residual hardcoded `main` outside the gate, and what part one does about each

| Location | Nature | Disposition |
|---|---|---|
| `.github/workflows/pr.yml:5,14,30,106,120`, `board-regate.yml:15,21` | Kanmer's own repo policy | **Unchanged** — FRD-031 forbids changing it to demonstrate another policy |
| `scripts/release-flow.mjs:4` `RELEASE_BASE_BRANCH="main"`, `:43,47` `release/v<version>`, `v<version>`; `scripts/release.mjs:190,239,260,266,313,424` | Kanmer's own *artifact publishing* rail | **Unchanged** — it publishes the app, it is not board delivery state. Useful as the shape a `releaseCandidatePattern` describes. |
| `packages/core/src/prompts.ts:150` (`"on merged main"`), `:234-237` feasibility reason | dispatch prompt catalogue; `prompt: (id) => string` | **Candidate, low cost**: widen to `prompt(id, verificationTarget?)` and pass the resolved target from `index.ts:994` (which has the board). GUI previews at `apps/gui/src/main/index.ts:1357,1362` keep the default, so no GUI change. Dispatch is disabled by operator policy on this board, so this is cosmetic-but-visible. |
| `packages/core/src/stages.ts:66` prose | stage description | Text only; update alongside `prompts.ts` or leave |
| `plugins/kanmer/skills/kanmer-execute/SKILL.md:204` (`origin/main`), `:277` (`gh pr create` with **no `--base`**), `kanmer-auto/SKILL.md:139-140` (`rebase origin/main`) | worker instructions | **In scope**: read the base branch and PR target from the packet's delivery block; `gh pr create --base <prTarget>` |
| `kanmer-verify/SKILL.md:45,48,70,185`, `kanmer-review/SKILL.md:73`, `kanmer-closeout/SKILL.md:101-102`, proof templates | verification prose | Mostly SKILL-036's lane; touch only where the packet already supplies the target |
| `scripts/verify-skill-prose.mjs:303` asserts ``/`main`\s+history/i`` in the **groom** skill | prose lint | Do not touch groom; this lint constrains any blanket "de-main" edit |
| `packages/mcp-server/src/index.ts:622` `KANMER_BOARD_BRANCH \|\| "kanmer-board"` | board branch, not delivery | Out of scope |

### F-15 — board.yml write path and the doc comment that must move with it

`readBoardWithSource()` `board.ts:281-290` (parse; missing file ⇒
`defaultBoardConfig()` with `source: "default"`), `writeBoard()` `:292-296`
(re-parse then `assertUniquePrefixes`), `store.getBoard` `:371`, `store.setBoard`
`:387-396`, `store.updateBoard(mutator)` `:399-407` (the targeted-edit entry
point, under `withExclusiveFileLock`). The doc comment at `board.ts:27-33`
enumerates *"areas, profiles, group kinds, proof types and deployment
environments"* as what remains configurable — it must gain delivery.
Cross-field validation belongs beside `assertUniquePrefixes` in `writeBoard`.
`injectCaptureProfile`/`injectFixEnterReview` (`board.ts:105-124`, rationale
`:47-104`) document why `board.X ?? DEFAULT` never reaches a board that already
carries its own block — read before designing the default.

GUI round-trip: `apps/gui/src/main/index.ts:1221` → `store.setBoard`;
`Settings.tsx:90, 825-826, 962, 1105, 1110` `structuredClone`s the whole config,
so a block unknown to that GUI survives **only** because zod keeps it — i.e.
only on a GUI built from this change or later.

### F-16 — ADR-0005 constrains the delivery-state design

`docs/architecture/adr/ADR-0005-proof-not-deployment.md` already decided that
proof is separate from deployment, that `deployment` is *"a separate,
non-gating tracker recorded at closeout"*, and that proof defaults to a local
build of merged `main` with `proof:visual@<env-id>` as the opt-in to deployed
evidence. Delivery state must follow the same rule — **non-gating** — which is
exactly what FRD-031's edge case (F-08) demands and what makes the two documents
consistent rather than in tension.
