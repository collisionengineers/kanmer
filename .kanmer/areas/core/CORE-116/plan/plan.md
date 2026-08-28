# Plan — CORE-116: configurable Git delivery policy and delivery state

## Objective

Give every project a declared Git delivery policy (integration branch, release
branch, optional release-candidate pattern, hotfix-backport rule) whose default
is exactly Kanmer's current main-only behaviour; make the execution packet name
the exact base SHA, base branch, PR target and verification target; make the
merge gate notice a PR that targets the wrong branch; and record delivery state
on the ticket, **non-gating**, independently of the workflow stage. Release
serialization is [[CORE-132]].

## Starting state

- No delivery/release model exists anywhere in code. `BoardConfigSchema`
  (`types.ts:365-393`) has `deployment` but no `delivery`;
  `ItemFrontmatterSchema` (`:410-520`, `.passthrough()`) has `deployment` but no
  `delivery_*`.
- `merge-gate.ts` never mentions a branch: `MergeGatePrInput` `:16-21` is
  `{ number, headSha, branch, body }` (head ref only). `SOFT_CODES` `:165`,
  `levelFor` `:167-169`, `evaluateMergeGate(store, pr, phase2?)` `:337`,
  `evaluatePhase2` `:290-330`.
- `check-pr.mjs:31-39` reads `pull_request.base.sha` and **discards
  `base.ref`**; exports `readPrEvent` at `:165`.
- `ExecutionPacketReady` (`execution-packet.ts:123-151`) carries no branch
  target of any kind. `StepPacketWorkspace` (`step-packet.ts:57-61`) is
  `{ branch, worktree }`, populated at `execution-packet.ts:648`.
- `packages/core/src/reconciliation.ts:58-71` already consumes
  `release.state`; the collector at
  `packages/mcp-server/src/reconciliation.ts:311-313` is stubbed
  `not-applicable`.
- Worktree `.worktrees/core-116`, branch `core-116-delivery-policy` from
  `origin/main` `bf0eaed4`; `npm install` already run there.
- `research`, `files` and `open-questions` are written; their decisions (Q1–Q7)
  are binding for this plan. `get_sources` for area `core` / label
  `reliable-autonomy` returns **0 declarations**, so no external source is cited.

## Governing docs

- **FRD-031** — **Meets**, for the part this ticket owns (open-questions Q1;
  the FRD is **not** edited): per-project declaration of integration branch,
  release branch, optional release-candidate pattern and hotfix-backport rule;
  normal implementation PRs target the configured integration branch (enforced
  by the new merge-gate check); execution material names the exact base SHA,
  base branch, PR target and verification target; workflow stage represents
  acceptance against the integration target while a separate delivery state
  records not-integrated / integrated branch+SHA / release candidate / released
  branch+tag / deployed / production-verified; a release-branch hotfix records
  its required integration backport; Kanmer's own repository policy is
  unchanged (its board gets no `delivery:` block — the default **is** its
  current policy). **Defers to [[CORE-132]]**: immutable candidate identity,
  remediation minting a new identity, the release-channel lease and
  `RELEASE_CHANNEL_HELD`, superseded successors, and the unavailable-release-
  service retry schedule. **AC coverage here:** AC1 in full, AC5 in full, AC2
  except its immutable-candidate clause, and the edge case *"release evidence
  never turns an unmerged feature branch into a verified ticket"*.
- **ADR-0021** — **Meets**: nothing here makes candidate Kanmer the live board
  authority. The board stays readable by the installed stable v0.3.12: additive
  optional config plus additive optional `.passthrough()` frontmatter, no format
  bump (open-questions Q6), no new on-disk artefact.
- **ADR-0005 (proof, not deployment)** — **Meets**: delivery state is a
  non-gating tracker, exactly as `deployment` is. No gate reads it. This is what
  makes FRD-031's "unmerged branch" edge case automatic, and it gets an explicit
  regression test rather than being left to construction.
- **FRD-030 / CORE-115** — **Meets**: no ownership model is added or forked. All
  writes go through existing `KanmerStore` methods, which already serialise on
  `withLeaseLock`.
- **FRD-029 / CORE-114** — **Meets**: `expected_revision` and `expected_project`
  remain honoured on every write; no new write path bypasses them.
- **PRD-002 requirement 4** — partially met here, completed by [[CORE-132]].
- No new ADR: no new subsystem, storage artefact, stage or ownership model. The
  design decisions are recorded in `open-questions` Q1–Q7.

## Required changes

1. **`packages/core/src/types.ts`**
   - `DeliveryConfigSchema` beside `DeploymentConfigSchema` (`:331-336`):
     `{ integrationBranch?: string.min(1), releaseBranch?: string.min(1),
     releaseCandidatePattern?: string.min(1).nullable(), hotfixBackport?: boolean }`
     — every key optional so a partial block is legal.
   - `delivery: DeliveryConfigSchema.optional()` on `BoardConfigSchema` beside
     `deployment:` (`:379`).
   - `DELIVERY_STATES = ["not-integrated","integrated","release-candidate","released","deployed","production-verified"] as const`;
     `type DeliveryState`. `DEFAULT_INTEGRATION_BRANCH = "main"`.
   - `interface DeliveryPolicy { integrationBranch: string; releaseBranch: string;
     releaseCandidatePattern: string | null; hotfixBackport: boolean }`.
   - Optional frontmatter, all additive: `delivery_state`, `delivery_branch`,
     `delivery_sha`, `delivery_candidate`, `delivery_release_branch`,
     `delivery_release_tag`, `delivery_backport_required`,
     `delivery_backport_sha`, `delivery_recorded_at` (Timestamp).
   - The same nine keys, optional, on `CreateItemInput` / `UpdateItemInput`
     (mirroring how `deployment` appears at `:572-573`, `:604-605`).
2. **`packages/core/src/board.ts`**
   - `resolveDelivery(board): DeliveryPolicy` beside `resolveEnvironments()`
     (`:206-209`). Defaults, exactly goal.md's default block:
     `integrationBranch = board.delivery?.integrationBranch ?? "main"`;
     `releaseBranch = board.delivery?.releaseBranch ?? integrationBranch`;
     `releaseCandidatePattern = board.delivery?.releaseCandidatePattern ?? null`;
     `hotfixBackport = board.delivery?.hotfixBackport ?? true`.
   - `deliveryPolicySource(board): "board" | "default"` — `board.delivery`
     present ⇒ `"board"`.
   - `assertDeliveryPolicy(board)` called from `writeBoard()` (`:294`) beside
     `assertUniquePrefixes`: branch names non-empty, no whitespace and no
     leading/trailing `/`; `releaseCandidatePattern`, when present, non-empty
     and containing `*`. `integrationBranch === releaseBranch` is **legal** —
     that is main-only.
   - Extend the configurables list in the doc comment at `:27-33`.
3. **`packages/core/src/frontmatter.ts`** — nine `KEY_ORDER` entries in the
   order above, immediately after `deployment` (`:48`).
4. **`packages/core/src/store.ts`** — `assertDeliveryAgainstBoard(policy, merged)`
   modelled on `assertDeploymentAgainstBoard` (`:2554-2572`), applied to the
   **merged** post-patch record so a two-call sequence is validated the same as
   a one-call one. Rules, each with an explicit message prefix:
   - `DELIVERY_STATE_INVALID:` — `delivery_state` not in `DELIVERY_STATES`.
   - `DELIVERY_EVIDENCE_MISSING:` — `integrated` or later requires
     `delivery_branch` and a 40-hex `delivery_sha`; `released` or later also
     requires `delivery_release_branch` and `delivery_release_tag`.
   - `DELIVERY_NO_CANDIDATE_POLICY:` — `release-candidate` requires the board to
     declare `releaseCandidatePattern` **and** a non-empty `delivery_candidate`.
     (The identity is an opaque string here; [[CORE-132]] mints and freezes it.)
   - `DELIVERY_TARGET_INVALID:` — `delivery_branch` must equal the policy's
     integration branch or its release branch; the message names both.
   - **Hotfix backport (AC5), deterministic, no judgement call:** when
     `delivery_branch === policy.releaseBranch`,
     `policy.releaseBranch !== policy.integrationBranch` and
     `policy.hotfixBackport`, the same write sets
     `delivery_backport_required = policy.integrationBranch`. It is cleared only
     by a 40-hex `delivery_backport_sha` in the same or a later write; supplying
     `delivery_backport_sha` with no obligation recorded is
     `DELIVERY_NO_BACKPORT_REQUIRED:`.
   - `delivery_recorded_at` is stamped by the store on any delivery change;
     `delivery_backport_required` is derived and **not** a caller input.
   - `""` clears an individual delivery field, exactly like `deployment`
     (`:855`, `:2583-2584`); change detection extended for each key.
   - Wire into `createItem` (`:694`, `:776`) and `updateItem` (`:806-815`,
     `:855`). No new store method, no new lock.
5. **`packages/core/src/merge-gate.ts`**
   - `baseRef?: string` on `MergeGatePrInput`.
   - `"WRONG_TARGET"` added to `MergeGateFindingCode` and to `SOFT_CODES`
     (`:165`), so it is a warning by default and an error under
     `KANMER_GATE_STRICT` — the CORE-123 compatibility convention.
   - `evaluateMergeGate` (`:337`) resolves `resolveDelivery(await store.getBoard())`
     and passes it into `evaluatePhase2`, which inserts the check **after
     `DEPENDENCY_BLOCKED` and before `reviewChecks`**: `skipped` when `baseRef`
     is absent (legacy callers); `pass` when it equals the integration branch,
     or equals the release branch while the ticket records
     `delivery_branch === releaseBranch` (a declared hotfix); otherwise `fail`
     naming the expected target. Details carry `{ baseRef, integrationBranch,
     releaseBranch, hotfix }`.
6. **`packages/mcp-server/src/check-pr.mjs`** — `readPrEvent` (`:31-39`) also
   returns `baseRef` from `pull_request.base.ref` when it is a non-empty string
   (absent ⇒ `undefined`, never an invented default), and passes it on the `pr`
   object. No other CLI contract change.
7. **`packages/mcp-server/src/execution-packet.ts`** — `delivery:
   ExecutionPacketDelivery` on `ExecutionPacketReady` (`:123-151`):
   `{ integrationBranch, releaseBranch, releaseCandidatePattern, hotfixBackport,
   policySource, baseBranch, baseSha, baseShaState: "resolved" | "unavailable",
   prTarget, verificationTarget, state, branch, sha, backportRequired }`.
   `baseBranch = prTarget = verificationTarget = integrationBranch` for ordinary
   tickets; all three become the **release branch** when the ticket already
   records `delivery_branch === releaseBranch`. `baseSha` comes from a bounded
   `git rev-parse` of `origin/<baseBranch>` falling back to `<baseBranch>`, run
   in the repo root with the same `timeout`/`maxBuffer` discipline as
   `reconciliation.ts:300-315`, degrading to `null` + `"unavailable"`.
   **`step-packet.ts` and `STEP_PACKET_VERSION` are untouched** (Q3).
8. **`packages/mcp-server/src/index.ts`** — `get_status` gains
   `delivery: { ...resolveDelivery(board), source: deliveryPolicySource(board) }`
   beside `leases:` (`:683`); `update_item` gains eight optional string params
   (the nine keys minus the derived `delivery_backport_required`) beside
   `deployment` (`:1426-1429`); the item view (`:403`) carries them.
   **No new tool — the roster stays 39** (Q7).
9. **`packages/core/src/prompts.ts`** — `DispatchTask.prompt` becomes
   `(id: string, verificationTarget?: string) => string`; `:150` and the
   feasibility reason at `:234-237` use the argument, falling back to the
   phrase "the merged integration branch" rather than to `main`. Only
   `packages/mcp-server/src/index.ts:994` passes a target; the two GUI preview
   call sites keep the one-argument form, so **no GUI file changes** (Q5).
10. **`packages/core/src/index.ts`** — export the new types, constants and
    resolvers.
11. **Tests** (new files only — CORE-128 owns `store.test.ts` et al.):
    - `packages/core/src/delivery.test.ts`
    - `packages/mcp-server/src/delivery.test.mjs`
    - additive assertions in `packages/mcp-server/src/smoke.mjs`
12. **Docs and skills** — `plugins/kanmer/skills/kanmer-execute/SKILL.md`
    (`:204` base branch/SHA from the packet; `:277` `gh pr create --base
    <prTarget>`); `kanmer-tickets/references/tool-reference.md`;
    `AGENTS.md` §4 field lists and a §8 gotcha for the
    board.yml-strips / frontmatter-passthrough asymmetry;
    `docs/manual/glossary.md` entries beside "Lease" (`:45`);
    `packages/mcp-server/src/reconciliation.ts:311-313` comment retargeted to
    name [[CORE-132]]; `packages/core/src/types.ts:931` likewise.
13. **Artefact** — `npm run build && npm run plugin:build && npm run
    plugin:check` **from the main checkout** (AGENTS.md §8 gotcha 8); commit the
    rebuilt bundle.

## Expected files

| Action | Path | Responsibility |
|---|---|---|
| Modify | `packages/core/src/types.ts` | schemas, states, policy type, inputs |
| Modify | `packages/core/src/board.ts` | `resolveDelivery`, source, `assertDeliveryPolicy` |
| Modify | `packages/core/src/frontmatter.ts` | key order |
| Modify | `packages/core/src/store.ts` | `assertDeliveryAgainstBoard`, create/update wiring, backport derivation |
| Modify | `packages/core/src/merge-gate.ts` | `baseRef`, `WRONG_TARGET`, policy-aware check |
| Modify | `packages/core/src/prompts.ts` | verification target argument |
| Modify | `packages/core/src/index.ts` | exports |
| Modify | `packages/core/src/reconciliation.ts` *(comment only)* | retarget the CORE-116 note |
| Create | `packages/core/src/delivery.test.ts` | core contract + AC fixtures |
| Modify | `packages/mcp-server/src/check-pr.mjs` | `base.ref` plumbing |
| Modify | `packages/mcp-server/src/execution-packet.ts` | packet delivery block, bounded base-SHA resolution |
| Modify | `packages/mcp-server/src/index.ts` | `get_status.delivery`, `update_item` params, item view, prompt target |
| Modify | `packages/mcp-server/src/reconciliation.ts` *(comment only)* | retarget the CORE-116 note |
| Create | `packages/mcp-server/src/delivery.test.mjs` | CLI/gate boundary |
| Modify | `packages/mcp-server/src/smoke.mjs` | MCP proof; roster stays 39 |
| Modify | `plugins/kanmer/skills/kanmer-execute/SKILL.md` | base branch/SHA and `--base` from the packet |
| Modify | `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | field/status reference |
| Modify (generated) | `plugins/kanmer/mcp/kanmer-mcp.cjs` + setup runtime | `npm run plugin:build` at repo root |
| Modify | `AGENTS.md`, `docs/manual/glossary.md` | docs |

## Do not modify

- `docs/functional/frd/FRD-031-*.md` — the FRD is met in part, never edited.
- `.github/workflows/pr.yml`, `.github/workflows/board-regate.yml`,
  `scripts/release.mjs`, `scripts/release-flow.mjs` — Kanmer's own repository
  and publishing policy. **Adding a `delivery:` block to Kanmer's own board is
  also forbidden**: the default is its current policy.
- `packages/core/src/step-packet.ts` and `STEP_PACKET_VERSION`.
- `packages/core/src/io.test.ts`, `docs.test.ts`, `migrate.test.ts`,
  `store.test.ts`, `scripts/antigravity-plugin-config.test.mjs` — CORE-128's
  lane. **Stop and report** rather than editing one.
- `packages/core/src/gates.ts`, `profiles.ts` — delivery state is non-gating.
- `packages/core/src/migrate.ts`, `version.ts` — no format bump.
- `apps/gui/**`; `packages/mcp-server/src/http*.ts`;
  `packages/mcp-server/src/project-registry.ts` (its `policy` field gets
  documented meaning only, in prose).
- `plugins/kanmer/skills/kanmer-groom/**` —
  `scripts/verify-skill-prose.mjs:303` asserts a `` `main` history`` phrase there.
- `.worktrees/kanmer` and `.kanmer` contents by hand.
- Any existing test assertion — extend, never weaken.

## Constraints

- **Additive optional fields only; no format bump.** The live board is served by
  the installed stable v0.3.12, which knows none of these keys:
  `ItemFrontmatterSchema` is `.passthrough()` so ticket fields survive it, and
  Kanmer's own board deliberately carries no `delivery:` block.
- **Tool roster stays 39** (`smoke.mjs:69`). No new MCP tool.
- **Core stays git-free.** The base SHA is resolved at the MCP boundary with a
  bounded subprocess and degrades to `unavailable`; core never spawns git.
- **Delivery state never becomes a gate input.** Nothing in `gates.ts`,
  `profiles.ts` or `move_item` may read a `delivery_*` field.
- `expected_project` on every board write from this lane; `expected_revision`
  stays honoured; `MSYS_NO_PATHCONV=1` for `git show ref:path`.
- Known host quirks (antigravity EBUSY, core 5 s timeouts, teardown ENOTEMPTY,
  `http.test.mjs` spawn ETIMEDOUT, `kanmerGit.test.ts` hook timeouts, tunnel
  readiness) are **recorded, not chased** — CORE-128 owns them. Hosted `verify`
  is authoritative.
- Foreground commands with a 600000 ms timeout, logging to unique
  `%TEMP%\core-116-*.log` paths.

## Ordered steps

1. Confirm the worktree `.worktrees/core-116` on `core-116-delivery-policy` at
   `origin/main` `bf0eaed4`; `take_ticket` recording that branch and worktree.
2. `types.ts` schemas/states/policy/inputs + `frontmatter.ts` key order +
   `index.ts` exports (changes 1–3, 10); `npm run typecheck -w @kanmer/core`.
3. `board.ts` `resolveDelivery` / `deliveryPolicySource` / `assertDeliveryPolicy`
   (change 2); first tests in `delivery.test.ts` for defaults, a partial block
   and policy validation.
4. `store.ts` `assertDeliveryAgainstBoard`, create/update wiring, backport
   derivation, `""`-clears (change 4); tests for every refusal code, the
   round-trip and the derived backport.
5. The three FRD fixtures in `delivery.test.ts`: AC1 main-only; AC2 dev→main
   (integrates into `dev` at an exact 40-hex SHA, reaches Done with proof while
   delivery state is only `integrated`, then records `release-candidate` and
   `released` separately); AC5 release-branch hotfix auto-recording its `dev`
   backport and clearing only on a backport SHA. Plus the edge-case regression:
   `delivery_state: released` does **not** let `move_item … done` pass without
   `proof`.
6. `merge-gate.ts` `baseRef` + `WRONG_TARGET` + policy-aware check (change 5);
   tests in `delivery.test.ts` for skipped / pass / hotfix-pass / warn / strict-error.
7. `check-pr.mjs` `base.ref` plumbing (change 6) and
   `packages/mcp-server/src/delivery.test.mjs` driving the CLI against a board
   with `integrationBranch: dev` and an event whose base is `main`.
8. `execution-packet.ts` delivery block and bounded base-SHA resolution
   (change 7); `index.ts` `get_status.delivery`, `update_item` params, item view
   (change 8); `prompts.ts` verification target (change 9).
9. `smoke.mjs` additions; `node packages/mcp-server/src/smoke.mjs` and
   `npm run smoke:protocol`.
10. Docs and skills (change 12), including retargeting the two CORE-116 comments
    to [[CORE-132]].
11. From the **main checkout** on this branch's state:
    `npm run build && npm run plugin:build && npm run plugin:check`; commit the
    bundle.
12. Full rail `npm run verify` (exit codes recorded; known quirks noted, not
    chased); write the post-implementation report; open the PR with a
    `Kanmer: CORE-116` footer; move to Review.

## Acceptance checks

- **Production callers exercised:** `update_item` handler → `store.updateItem`
  → `assertDeliveryAgainstBoard`; `create_item` → `store.createItem`;
  `get_status` → `resolveDelivery`; `get_execution_packet` → the delivery block;
  `check-pr.mjs` → `evaluateMergeGate` → the `WRONG_TARGET` check; GUI
  `CH.setBoard` → `store.setBoard` → `writeBoard` → `assertDeliveryPolicy`.
- **FRD-031 AC1:** a default-policy (main-only) board resolves
  `integrationBranch/releaseBranch/prTarget/verificationTarget = "main"`,
  accepts `integrated` at `main` with an exact 40-hex SHA, and refuses it
  without one.
- **FRD-031 AC2 (this ticket's half):** a `{ integrationBranch: dev,
  releaseBranch: main, releaseCandidatePattern: "release/*" }` board targets
  `dev`; the ticket reaches `done` on proof while `delivery_state` is
  `integrated`; `release-candidate` and `released` are recorded afterwards
  without touching the stage.
- **FRD-031 AC5:** on that board, `delivery_branch: main` auto-records
  `delivery_backport_required: dev`, and only a 40-hex `delivery_backport_sha`
  clears it.
- **FRD-031 edge case:** a ticket with `delivery_state: released` and no `proof`
  is still refused `preparing → … → done`; the refusal names `proof`.
- **Merge gate:** `WRONG_TARGET` is `skipped` with no `baseRef`, `pass` on the
  integration branch, `pass` on the release branch for a recorded hotfix,
  `warn` (non-blocking, `ok` stays true) otherwise, and `fail` under
  `KANMER_GATE_STRICT`. Kanmer's own PRs (base `main`, default policy) stay
  `pass` — no behaviour change for this repo.
- **Compatibility:** a board with no `delivery:` block and tickets with no
  `delivery_*` fields serialise byte-identically to before; the tool roster is
  39; `npm run plugin:check` passes.
- **Non-gating:** no `delivery_*` reference exists in `gates.ts` or `profiles.ts`
  (assert by grep in the report).
- Commands and exit codes retained in the post-implementation report.

## Commands

- `npm run typecheck` (root, all four workspaces named in the output)
- `npm test -w @kanmer/core`
- `node --test packages/mcp-server/src/delivery.test.mjs`
- `node --test packages/mcp-server/src/check-pr.test.mjs`
- `npm run build` then `node packages/mcp-server/src/smoke.mjs` and
  `npm run smoke:protocol`
- Main checkout: `npm run build && npm run plugin:build && npm run plugin:check`
- `npm run verify` (authoritative; foreground, 600000 ms timeout, unique
  `%TEMP%\core-116-*.log`)

## Failure and deviation rules

Stop and report, rather than redesigning silently, on: a needed edit to one of
CORE-128's five test files; any change to `apps/gui/**`, `http*.ts` or the
endpoint registry; a test that can only pass by weakening an assertion; a
required new MCP tool or a roster change; a board format bump; a required edit
to FRD-031 or to Kanmer's own workflow/release scripts; a `verify` failure not
attributable to the recorded host quirks; or a governing-doc conflict. Every
deviation is recorded in the post-implementation report.

## Stop condition

PR open against `main` with a `Kanmer: CORE-116` footer, ticket in Review with
the post-implementation report written. No review, merge, verify, closeout or
release, and no work on any other ticket.
