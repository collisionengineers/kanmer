# Kanmer Masterplan

**Status:** Adopted roadmap source of truth · 2026-08-20
**Supersedes and replaces:** `Kanmer_Workflow_and_Reliability_Redesign_Clean.md` (the 19 Aug manifesto) and `design-doc.md` (the 20 Aug v1 spine spec). Both are deleted from the working tree by this adoption; their full text remains in session history and their surviving decisions are carried below. Durable *specification* content lands in ADR-0016 and FRD deltas (seed S-14), never back in a root manifesto.
**Verified against:** `main` @ `db7ed67`, `kanmer-board` @ `6bd2f36` (board worktree healthy, on-branch, clean, 175 tickets), Pegasus @ `8812b278` (failure corpus, 2026-08-18 → 2026-08-20).

---

## 1. Purpose

Kanmer exists so that a strong planner can compile work into bounded packets that **weaker agents (Sonnet/Haiku-class) execute accurately**, in parallel, without partial implementations, scope drift, or rule-breaking — and so that a human can approve, follow, and trust the result. This document is the single roadmap: operating model, standing principles, the agent conduct canon, three release horizons, the complete ticket seed catalog, and the execution/learning protocol.

What it is not: a specification. Specs live in `docs/` (ADRs/FRDs). Per-ticket technical depth lives in each ticket's own pipeline documents, produced by the pipeline with fresh code verification — never copied from here.

## 2. Operating model — the compiled workflow

Four audiences read a ticket, and forcing them to share one surface is the root failure. Each audience gets its own **existing** artifact:

| Audience | Question | Artifact (already exists) |
|---|---|---|
| Human (approval) | What am I signing off? | Ticket body; for grouped work the group's `context.md` |
| Weak implementer (execution) | What exact job, and when do I stop? | `plan/` brief + `checklist/` + (once built) `get_execution_packet` |
| Strong reviewer | Does this diff match the brief on this exact SHA? | `scratch/review.md` (whole-file replace, SHA frontmatter) + GitHub threads |
| Verifier (evidence) | Did the merged SHA actually work? | `proof/` with `merged_sha` frontmatter |

Responsibility split:

- **Strong planner (Fable-class):** resolves every product/architecture decision, decomposes features into groups + small tickets, writes exact briefs with stop conditions, selects context. A brief containing *investigate / decide / choose / determine* is not dispatchable.
- **Weak implementer (Sonnet/Haiku-class):** one ticket, one branch, one worktree (`.worktrees/<id>`), one bounded packet. Reports deviations; never redesigns, never merges, never edits governing docs, never continues into another ticket.
- **Deterministic harness:** gates on `move_item`, `npm run verify`, GitHub required checks (`verify`, `kanmer/gate`), branch protection, exact SHAs. A compiler exit code outranks an agent saying "tests passed".
- **Strong reviewer:** reviews the actual diff at the exact head SHA against the approved outcome; every finding gets a disposition; merge only when the physics allow it.

Structural rules (settled; do not relitigate): groups + `blocks` links, **not** parent/child tickets. Six fixed stages. Gates stay existence-based (ADR-0005); readiness is **predicates**, not new columns. `create_item` stays ungated (backfill is a feature). GitHub — not the board — is the merge boundary.

## 3. Principles and standing non-goals

1. **Evidence before abstraction.** A control, template, or tool is added only against an observed failure, and starts advisory.
2. **One parser, one pyramid, one source of truth.** No second copy of the checkbox regex, the verify step list, or the profile table.
3. **Skills derive, never restate** (ADR-0009). `get_doc_gates` is the only gate authority.
4. **Keep the technical detail; stop making every audience read all of it.**
5. **Custom profile is for backfill/import only.** New work uses feature/fix/chore/spike. (Pegasus's five-concern `profile: custom` release ticket shipped new features and a 2× cost increase under hand-written gates.)

**Non-goals (carried intact):** no expiring leases/heartbeats; no automatic risk-overlay engine; no role-scoped MCP binaries; no metrics platform; no golden-board eval harness (quarry); no GitHub App before the Actions gate proves the contract; no format-4 migration; no new stages, parent/child storage, or gated document types; no `board.yml` profile materialization (injection stays, shown as `compensated`, never `behind`); no merge queue or RC freeze at this scale; no LLM scoring of prose as a hard gate; no automatic merge.

## 4. Agent conduct canon

These rules ship in the AGENTS.md **managed block** (seed S-28) for every repo Kanmer works, appear as acceptance lines in brief templates, and are review-checklist items. Each carries its evidence.

**Scope**
1. **Scope is the brief.** "While I'm here" changes are follow-up tickets, not commits. *(Pegasus DELIV-012: a release ticket became five projects.)*
2. **Never absorb another ticket's scope.** Link it; let it be worked on its own record. *(Pegasus PRs #427/#428 absorbed PLAT-007 and DOCS-001, orphaning both.)*
3. **Release and remediation work ships no new features.** *(DELIV-012 shipped a new Core projection and a 2× infra cost increase.)*
4. **The ticket precedes the branch.** No board record, no PR. *(Pegasus board froze at 15:01Z; the next 7 PRs — including a data-loss hotfix and two releases — cited ticket documents that do not exist.)*
5. **Stop at the stop condition.** Never merge your own PR; never start the next ticket; deviations are reports, not redesigns.

**Build**
6. **Greenfield has no legacy.** Unless the brief names existing users or data, there are none: no fallback shims, no compat layers, no deprecation paths. Delete what you replace.
7. **Reuse before build.** Name the existing helper/port/route you extend; if it is genuinely unfit, report that as a deviation — do not silently build a parallel one. *(Pegasus INTK-011: a drifted second copy of a token shape made group routing unable to find its member — operator lost uploaded images in production within 2 hours of ship.)*
8. **One list per concept.** A second copy in another layer is duplication even when it is "just strings". *(Pegasus `OperatorLabels.FileSize` vs `site.js` doing exactly what the C# comment forbids — flagged in review, still live.)*
9. **Paths are relative** (repo-root-relative or injected config). Never `C:\Users\…`, never `/home/…`.
10. **Dependencies are approvals.** No new package unless the brief lists it.
11. **Concurrency results are never discarded** — retry, defer, or surface; a swallowed conflict is a data-loss bug. *(INTK-011 root cause: caller discarded a serialization-conflict result — no retry, no defer.)*
12. **Errors surface.** No catch-all suppression, no empty catch.
13. **No fabricated domain data** — emails, names, records, images. Test fixtures use the documented estate. *(Pegasus TICK-045 fabricated `claims@…` against a documented four-address estate.)*

**Prove**
14. **Done means wired.** New code needs a production caller — a registration, a route, a composition entry — named in the PR. Registered-but-unreachable is not done; referenced-only-by-tests is not done. *(Pegasus SIMPLI-014 renderer: full green proof, zero callers, Chromium absent from the container; TICK-093 store: no DI registration, duplicate owner; TICK-044: static policy whose own ticket ruled "referenced only by tests must not pass review".)*
15. **Runtime dependencies ship in the artifact.** A feature that needs a browser/font/package proves the deployed image carries it.
16. **A schema change and its permissions ride the same diff.** Migration + grants + bootstrap census together. *(Pegasus: four ungranted tables in one day; one already broken in production — "total, immediate outage of the assessment surface".)*
17. **Recorded commits must be reachable.** SHAs written to a ticket must exist on the merge target. *(Pegasus TICK-011: "done" citing 3 commits, 2 unreachable from any ref; seven tickets walked the full pipeline producing zero repository diff.)*
18. **Stubs are not done.** No TODO, placeholder, or mock presented as implementation.
19. **Tests prove the claim.** Never weaken or delete an assertion to pass; a test that invokes nothing proves nothing. A failing test is a stop-and-report, not a skip.
20. **Verify with exit codes.** Run the stated commands, record outputs; `INCONCLUSIVE` ≠ `PASS`; a rerun that passes does not erase the failed attempt.
21. **No speculative CI or tests.** A gate that gates nothing is deleted cost. *(Pegasus built, ran once, and deleted a nightly pressure lane and a Markdown-placement gate inside the same window.)*

**Conduct**
22. **Review findings get dispositions** — fixed, rejected-with-reason, accepted-risk, or deferred-to-ticket; never silence. *(Pegasus: 32 review comments merged unaddressed, then 7 PRs with no review at all, one merged in 59 seconds.)*
23. **Secrets never appear in code, tickets, or proofs.**
24. **A PR that changes commands or conventions updates AGENTS.md in the same PR.**

## 5. Horizons

| Horizon | Theme | Outcome when done |
|---|---|---|
| **0.4.0 — Compiled workflow spine** (HZN-004, retitled) | Merge physics + weak-agent execution | GitHub physically refuses unready/stale merges (`verify` + `kanmer/gate` + protection); weak agents start from one bounded packet; review/proof are SHA-bound records; the board worktree cannot be recorded as a ticket worktree; skills are gates-first. |
| **0.4.1 — Remote access & providers** (new HZN) | One transport, N tunnels; provider parity; release rail | Kanmer MCP serves Streamable HTTP with token auth; tunnel providers are adapters (cloudflared first); the OpenAI Secure MCP Tunnel remains an independent OpenAI-managed stdio path; connector health is diagnosable; grok/Antigravity move to real plugin installs; the release pipeline can no longer ship broken assets. |
| **0.5.0 — AGENTS.md ownership & domain coverage** (new HZN) | Kanmer owns AGENTS.md; domain templates | Every repo Kanmer works carries the managed block + conduct canon + a required-section skeleton, reconciled by kanmer-setup and hash-checked by `get_status.repo`; work-type brief templates (fix/UI/docs/cloud/data) and a lean greenfield playbook exist; board-vs-reality sweeps are part of grooming. |

Feature groups (epic kind), each with a `context.md` approval contract and a final `integration`-labeled verification ticket: **Compiled workflow spine**, **Remote access**, **Portable Codex Connect**, **AGENTS.md ownership**.

Implementation staffing: 0.4.0 is implemented ticket-first through the shipped pipeline by Sonnet agents with **Fable reviewing every PR** (the gate does not exist yet). Once `verify` + `kanmer/gate` + protection are live, later horizons shift to Sonnet-implements + gate + sampled strong review.

## 6. Ticket seed catalog

Machine-consumable. Each seed is one `create_item` (type `ticket`, status `backlog` unless stated). Group names in `groups:` are placeholders resolved to real IDs at creation time; `blocks:` edges are created **after** all tickets exist (stored on the blocker). Bodies follow the ticket template (What/Why/Approach/Verification). `docs_todo: true` appears on `feature` seeds until S-14's governing docs exist.

### 6.1 Groups to create

| Key | Kind | Title | context.md (approval contract summary) |
|---|---|---|---|
| G-SPINE | epic | Compiled workflow spine | Outcome: unready or stale work is physically unmergeable and weak agents execute from one bounded packet. In scope: verify/CI/protection, kanmer/gate, worktree guard + health, expected_project + structured errors, execution packet, SHA-bound records, gates-first skills, templates, editor modes. Out of scope: leases, overlay engine, GitHub App, role-scoped servers. Risks: GHA Windows flake (GUI-085 lands first); protection is a one-way social door (enable only after `verify` is green twice). Done: the integration ticket passes end-to-end on a disposable board. |
| G-REMOTE | epic | Remote access | Outcome: any remote MCP client can reach a local Kanmer board through one Streamable HTTP endpoint with token auth, via interchangeable tunnel adapters; health is diagnosable in one command. In scope: FRD/ADR, transport, auth, adapter contract + cloudflared, doctor, GUI lifecycle (GUI-095), provider-neutral manual (DOC-013), and the independent OpenAI Secure MCP Tunnel stdio path documented by DOC-010. Out of scope: MCP-020 dispatch-over-MCP (separate authz boundary), OAuth (deferred), multi-board single endpoints, Cloudflare Access, and Workers-hosted Kanmer. Risks: secrets handling (no plaintext), localhost-bind default, per-project isolation, and operator-owned provider credentials/executables. Done: MCP-028 proves a disposable Cloudflare Worker reaches the local bearer-authenticated endpoint and is then torn down. |
| G-CODEX | epic | Portable Codex Connect | Outcome: Codex registrations are byte-identical across machines via an installer-owned shim; source material is archived GUI-094's research/plan. Done: integration ticket proves a registration surviving a machine move + app update. |
| G-AGENTS | epic | AGENTS.md ownership | Outcome: Kanmer dictates AGENTS.md in every repo it works — managed block + conduct canon + required-section skeleton, reconciled by kanmer-setup, drift-visible in `get_status.repo`. Done: integration ticket proves it on a disposable repo. |
| G-HZN-041 | horizon | 0.4.1 — Remote access & providers | (no context.md required) |
| G-HZN-050 | horizon | 0.5.0 — AGENTS.md ownership & domain coverage | (no context.md required) |

Plus one group mutation: retitle existing **HZN-004** → `0.4.0 — Compiled workflow spine` (groom GA-01).

### 6.2 Horizon 0.4.0 — new seeds

#### S-01 · [core, chore] Create `npm run verify` wrapping one shared VERIFY_STEPS
- groups: [G-SPINE, HZN-004] · blocks: S-02
- **What:** `scripts/verify.mjs` exporting a single `VERIFY_STEPS` array + a root `"verify"` script; `scripts/release.mjs` imports the same array then continues with bump/pack.
- **Why:** GitHub cannot require a check that doesn't exist; AGENTS.md §10 is manual-only today. One step list prevents a third pyramid.
- **Approach:** dependency-free (same family as release.mjs). Steps: `npm test` (includes check:manual) → `npm run typecheck` (all workspaces) → `npm run build` → both MCP smokes → `npm run smoke:discovery` → `npm run verify:skills` → `npm run verify:agents-block` → `npm run plugin:check`. Excluded: GUI build, Electron boot smoke, `dist:check`, `plugin:build` (plugin:check compares committed bytes to a fresh build — running plugin:build in CI would dirty the tree). This **changes the release rail** (order + adds smoke:discovery + drops the duplicate check:manual entry) — say so in AGENTS.md §6: "`npm run verify` is the PR check; `scripts/release.mjs` is verify + bump/pack; do not invent a third pyramid."
- **Verification:** `npm run verify` green from the main checkout; release.mjs consumes VERIFY_STEPS; AGENTS.md §6 updated.

#### S-02 · [core, chore] GitHub Actions PR workflow — `verify` job only
- groups: [G-SPINE, HZN-004] · blocks: S-03, CORE-024
- **What:** `.github/workflows/pr.yml` with exactly one job `verify`: `windows-latest`, Node 20, `npm ci && npm run verify`, `defaults.run.shell: bash`, `permissions: contents: read`, triggers `opened|synchronize|reopened|ready_for_review` on PRs to `main` only.
- **Why:** first CI in the repo; `main` is unprotected and PR #64 shows `statusCheckRollup: []`.
- **Approach:** no `kanmer-gate` stub (never offer protection a check that hasn't appeared). `kanmer-board` pushes must not trigger it. Do not switch to ubuntu — Windows-specific tests are the product. Target < 10 min.
- **Verification:** job green on a real PR; board sync commits trigger nothing.

#### S-03 · [core, chore] Protect `main` and `kanmer-board`; write the ops playbook
- groups: [G-SPINE, HZN-004] · blocked by S-02, GUI-085
- **What:** Branch protection: `main` requires PR + check `verify` + conversation resolution, no force push/deletion; `kanmer-board` no-force/no-delete, **no PR requirement** (board mutations are direct pushes by design). Playbook at `docs/plans/compiled-workflow/playbook.md` records the exact settings, the required-check names as the GitHub UI shows them, and the rules: enable only after `verify` is green **twice**; never require a check that has not appeared once; add `kanmer-gate` to required checks only after its job has posted (CORE-024).
- **Verification:** un-checked PR cannot merge; direct push to main refused; board push still works.

#### S-04 · [core, fix] `takeTicket` refuses to record the board worktree; `get_status` reports board-worktree health
- groups: [G-SPINE, HZN-004]
- **What:** (a) pure path guard (`packages/core/src/worktree-guard.ts`) — `takeTicket` throws when the recorded `worktree` resolves to the board root or `<repo>/.worktrees/kanmer` (Windows case-insensitive compare; relative and absolute forms; trailing separators). Taking without a worktree stays allowed. (b) `get_status` gains `boardWorktree: {path, expectedBranch, actualBranch, onBoardBranch, boardSource, ticketCount, repair}` — informational, never blocking.
- **Why:** the DOC-010-era incident (board worktree checked out to a ticket branch, MCP serving an empty default board) is repaired but invisible; and nothing stops an agent recording the board path as its ticket worktree.
- **Approach:** no git subprocess in core (FRD-002 G2a) — path comparison only. The git inspect helper (~20 lines) is **duplicated** in `packages/mcp-server` and `apps/gui/src/main/kanmerGit.ts`, commented as a pair — do not extract a shared git package. `expectedBranch` defaults to `kanmer-board`, overridable via `KANMER_BOARD_BRANCH` env. MCP tool surface changed ⇒ `npm run build && npm run plugin:build && npm run plugin:check` **from the main checkout**, tool-reference untouched (no new tool).
- **Verification:** store tests — take with `.worktrees/kanmer`, with the absolute board path, with mixed separators all throw; `.worktrees/doc-011` succeeds; smoke asserts the health block.

#### S-05 · [mcp-server, feature, docs_todo] `expected_project` fingerprint + structured error codes
- groups: [G-SPINE, HZN-004] · blocks: S-06
- **What:** every write tool accepts optional `expected_project`; mismatch fails `WRONG_PROJECT` with no write. `KanmerError` + `failCoded` become the single `isError` builder with exactly three codes: `WRONG_PROJECT`, `REVISION_CONFLICT`, `GATE_BLOCKED` (text `Error: …` / `Conflict: …` wording unchanged — smoke matches it).
- **Why:** remote/multi-project agents can write to the wrong board; today `guard()` flattens everything to unstructured text.
- **Approach (load-bearing, from the verified spec):** fingerprint = `"kanmer-proj-v1:" + sha256` of `JSON.stringify({boardRoot, format, repoRoot})` — key order load-bearing, POSIX slashes, lowercase drive letter; `boardSource` displayed, never hashed. `get_status` gains `project` + `compat.expectedProject: "optional"`. Plumbing holes that must not ship: (1) zod strips undeclared keys — declare the field on **every** write inputSchema via a `withProject()` helper; (2) strip it before the store — `serialiseItem` preserves unknown keys into ticket YAML; (3) `create_items` takes it at **call level**, never inside `createFields`; (4) compare **before** `ensureInit()`; (5) `migrate_board` is a write tool too. New clients sniff `compat.expectedProject` before sending (0.3.3 servers reject unknown keys). Mandatory no earlier than the release after skills that send it have shipped. plugin:build from main checkout.
- **Verification:** smoke asserts `structuredContent.error.code` on conflict/gate/wrong-project; old-client (no field) writes still succeed; mismatch writes zero bytes.

#### S-06 · [mcp-server, feature, docs_todo] `get_execution_packet` — the weak-agent entry point
- groups: [G-SPINE, HZN-004] · blocked by S-05 · blocks: S-09, S-15
- **What:** one read-only composite tool: project identity, ticket (title/status/profile/area/groups/refs/body/taken), group `context.md` summaries, `plan`/`checklist`/`files` index docs with content-version tokens, listing of extra docs, the full `GateReport`, `stopCondition` (ATX-scraped "Stop condition" section of the plan, with a safe fallback: "Stop at the checklist; do not merge; do not start another ticket."), `commandsHint`. Refuses (`ready: false, code: GATE_BLOCKED`) in this order: not a ticket / legacy layout → profile `spike` (dominates — research is the deliverable) → `leave-preparing` not passable (missing list) → unresolved questions → taken by another actor (occupancy, `missing: []`).
- **Why:** a weak agent must make one call and receive exactly its bounded job, or a refusal — not assemble context from eight fragile reads.
- **Approach:** a `chore` with only `plan/` **is** ready — the packet demands only what the resolved profile does. Does not take, does not create worktrees, does not write. Composes MCP-019's multi-doc helper in whichever order lands first — they must not become two document APIs. Tool-reference row added above `## Field semantics`; smoke: ready ticket → `ready:true`, gated feature → refusal. plugin:build from main checkout.
- **Verification:** smoke additions green; spike refusal; chore-with-plan success.

#### S-07 · [mcp-server, fix] SHA-bound review and proof records
- groups: [G-SPINE, HZN-004] · blocks: S-09
- **What:** define and document the record schemas; fix the two stale MCP blurbs. `scratch/review.md` (whole-file **replace** via `set_ticket_doc`, never `append_scratch` — append cannot rewrite frontmatter): `{kind: review-attestation, pr, head_sha, verdict: pass|needs-changes, reviewer, independent, plan_hash, ticket_updated, findings[]}` where `plan_hash` = the content-version of `plan/plan.md` (same token `get_ticket_doc` returns). `proof/proof.md`: `{kind: proof-record, merged_sha, environment, verified_at, result: PASS|FAIL|INCONCLUSIVE|NOT_APPLICABLE|WAIVED_BY_OPERATOR, attempts[]}` — failed attempts are retained, a later pass does not erase them.
- **Why:** review prose with no SHA goes stale invisibly; Pegasus proved proof can be green while nothing shipped.
- **Approach:** gates stay existence-based (ADR-0005) — these are advisory records in this horizon; `kanmer/gate` reads `head_sha` via gray-matter (never a regex). Fix `get_ticket_doc`/`append_scratch` descriptions still saying `scratch-<slug>.md` where reality is `scratch/<slug>.md`. plugin:build from main checkout.
- **Verification:** smoke reads a written attestation's frontmatter; blurbs corrected; docs in FRD-006 delta (S-14).

#### S-08 · [skills, fix] kanmer-plan and kanmer-auto become gates-first
- groups: [G-SPINE, HZN-004]
- **What:** kanmer-plan: delete the unconditional "research and files must exist" demand (it contradicts the skill's own gates-first preamble); fetch them only when the resolved profile requires them or a material hole is obvious; the default human hand-off is an approval paragraph. kanmer-auto: delete Wave 0 "research everything in parallel"; Wave 0 becomes `get_doc_gates` per ticket, then only the next required phase for each.
- **Why:** both defects are verbatim on main and drive exactly the universal-pipeline behavior profiles exist to prevent.
- **Approach:** keep lane cap ~3, keep the board-worktree invariant. Add a `verify-skill-prose.mjs` rail asserting the deleted phrase does not return. Skill-only PR — no plugin bundle rebuild.
- **Verification:** `npm run verify:skills` green including the new rail.

#### S-09 · [skills, fix] kanmer-execute/review/verify bind to the packet, SHA records, and exact-SHA verification
- groups: [G-SPINE, HZN-004] · blocked by S-06, S-07
- **What:** execute — first data call is `get_execution_packet`; if `ready:false`, stop; sniff `get_status.compat.expectedProject` before ever sending the token; never merge; worktree `.worktrees/<id>` only; stop at the brief's stop condition. review — write `scratch/review.md` by whole-file replace with `head_sha` from `gh pr view --json headRefOid`; pull GitHub review threads into the disposition; once required checks exist, do not merge while they are red. verify — `git fetch origin && git worktree add --detach .worktrees/verify-<id>-<merged_sha> <merged_sha>` (from `gh pr view --json mergeCommit`); never update `main` in any checkout as a side effect; write proof frontmatter by replace; if the PR is unmerged this skill is running too early — stop.
- **Why:** today review self-documents merging outside the engine, and verify tests "whatever main is now".
- **Verification:** `verify:skills` green; a full ticket walked end-to-end uses the new paths.

#### S-10 · [skills, chore] Templates: approval contract, execution brief with stop condition, group context
- groups: [G-SPINE, HZN-004]
- **What:** `kanmer-plan/assets/approval-contract.md` (Outcome / Why / User or operational effect / In scope / Out of scope / Key decisions / Main risks / Breakdown / Evidence / Approval boundary — 300–600 words as guidance, never a gate); update `plan-template.md` to the brief shape (Objective / Starting state / Required changes / Expected files / Do not modify / Constraints / Ordered steps / Acceptance checks / Commands / Failure and deviation rules / **Stop condition**) plus an advisory warning when Required changes contains *investigate/decide/choose/determine*; `kanmer-tickets/assets/group-context.md` (Feature outcome / Users affected / Acceptance criteria / Non-goals / Shared decisions / Constraints / Risks / Dependency map / Rollout & rollback / Breakdown / Definition of done). Brief acceptance-check boilerplate includes the canon's prove-rules: *name the production caller; runtime deps ship in the artifact; schema change + grants ride this diff (when applicable)*.
- **Verification:** templates render; kanmer-plan references them; `[pre-review]`/`[post-merge]` tags documented as labels the gates ignore.

#### S-11 · [gui, feature, docs_todo] Editor: Scratch tab and group-context pane
- groups: [G-SPINE, HZN-004] · blocks: S-12
- **What:** a Scratch tab in the ticket editor bound to the existing gate-exempt `scratch/` folder (reuse `listScratch`/`getDoc`); when `item.groups[0]` exists, render that group's `context.md` above the ticket body via existing `getGroupDoc` — no new IPC, no new gated doc type, no fourth Board/Standup/Archived view.
- **Verification:** GUI vitest green; scratch files readable/writable from the tab; grouped ticket shows its context pane.

#### S-12 · [gui, feature, docs_todo] Editor modes: Approval / Execution / Review / Evidence
- groups: [G-SPINE, HZN-004] · blocked by S-11
- **What:** a local mode enum that picks the **starting** tab (Approval → body + context pane; Execution → plan; Review → scratch; Evidence → proof), dimming — never hiding — the rest. Board opens default to Approval; dispatch/execute flows may pass Execution.
- **Verification:** GUI tests for default-tab selection per mode.

#### S-13 · [gui, feature, docs_todo] Board-worktree health banner
- groups: [G-SPINE, HZN-004]
- **What:** GUI banner when the board worktree is not on the board branch or the board is a synthesized default where tickets are expected — using a main-process inspect helper in `kanmerGit.ts` (the GUI is not an MCP client). Pairs with S-04's server-side block (deliberately duplicated helper).
- **Verification:** simulated wrong-branch worktree shows the banner; healthy board shows nothing.

#### S-14 · [docs, chore] ADR-0016 + FRD deltas: the compiled workflow
- groups: [G-SPINE, HZN-004]
- **What:** ADR-0016 (compiled workflow; four audience contracts; readiness as predicates on the six stages; GitHub as merge physics; no new hierarchy/stages/gated types; `expected_project` compatibility window; custom-profile backfill-only policy). Deltas: FRD-003 (approval = body/group context; review records in scratch; Scratch tab), FRD-006 (proof frontmatter, exact-SHA verify), FRD-010 (packet ≡ dispatch enablement), FRD-016 (takeTicket path refuse; `force` unchanged; no leases), FRD-020 (board-worktree health observation; repair is ops), FRD-022 (tool count 31; `expected_project` on writes; `get_status` project/boardWorktree/compat; structured errors), FRD-023 (skill deltas), FRD-002/007 (the four readiness predicates; `enter-verifying` stays reserved and uninjected), FRD-019 (Scratch tab, context pane, mode enum). `docs/contributing/doc-structure.md` is generated — do not hand-edit.
- **Verification:** `check-doc-numbering` green; tickets S-05/S-06/S-11/S-12/S-13 link these refs and drop `docs_todo`.

#### S-15 · [core, chore, label integration] Spine integration verification
- groups: [G-SPINE, HZN-004] · blocked by S-03, S-06, S-09, CORE-025
- **What:** end-to-end on a disposable repo + board: packet fetched → refusal paths (spike, gated, taken) → take → implement → PR → `kanmer/gate` red on missing ticket / open questions → green → protected merge → exact-SHA verify → done. Proof is the command log.
- **Verification:** every gate fires at least once in the log; the happy path completes without manual overrides.

**Existing tickets regroomed into 0.4.0** (groom actions in §6.5): CORE-024 → *Implement `kanmer check-pr` — ticket linkage and open-questions merge gate (phase 1)* [fix, de-spiked; blocked by S-02]; CORE-025 → *Expand `kanmer/gate` — stage, dependency, review-SHA and commit-reachability checks (phase 2)* [fix, de-spiked; includes `COMMITS_UNREACHABLE`: every SHA in the ticket's `commits[]` must be reachable from the PR base — warn first, fail once records are routine]; MCP-017 (unit-test `isLinkedWorktree`); MCP-018 (module-resolution check replaces the cwd-shape premise); MCP-019 (multi-doc get — the packet composes it); GUI-085 (the canonical Windows test-timeout fix — **blocks S-03**); SKILL-016 + SKILL-017 (auto durable run state + stopping contract; already HZN-004).

### 6.3 Horizon 0.4.1 — new seeds

#### S-16 · [docs, chore] FRD: remote access architecture; ADR: Streamable HTTP transport
- groups: [G-REMOTE, G-HZN-041] · blocks: S-17, MCP-021
- **What:** FRD-025 (remote access: transport, auth model, tunnel-adapter contract, health/doctor surface, threat model — no plaintext secrets, localhost bind by default, one project per endpoint) and ADR-0017 (Streamable HTTP chosen as the one remote transport per the MCP spec; stdio remains the local default; per-provider tunnels are adapters, never transports).
- **Why:** MCP-021 explicitly requires FRD/ADR before implementation; four `feature` tickets are gate-blocked on governing docs.
- **Verification:** docs merged; MCP-021/GUI-095/S-17/S-18 link them as refs.

#### S-17 · [mcp-server, feature, docs_todo] Streamable HTTP transport for the Kanmer MCP server
- groups: [G-REMOTE, G-HZN-041] · blocked by S-16 · blocks: S-18, MCP-021
- **What:** the existing 30-tool surface served over Streamable HTTP (opt-in flag/env; default off), localhost bind, same store and root resolution, stdio path untouched; MCP spec session handling.
- **Approach:** no auth in this ticket (S-18); no tunnel logic (adapters); smoke gains an HTTP round-trip. plugin bundle unaffected unless tool surface changes (it should not).
- **Verification:** HTTP smoke green; stdio smoke unchanged.

#### S-18 · [mcp-server, feature, docs_todo] Remote auth: bearer tokens for the HTTP transport
- groups: [G-REMOTE, G-HZN-041] · blocked by S-17 · blocks: S-22
- **What:** per-project static bearer token (generated once, stored via Electron `safeStorage` — never plaintext on disk), required on every HTTP request, 401 otherwise; token rotation via GUI settings. OAuth is deferred quarry.
- **Verification:** requests without/with wrong token rejected; token never appears in logs, tickets, or config files in plaintext.

#### S-19 · [mcp-server, feature, docs_todo] Connector doctor — tunnel and transport health
- groups: [G-REMOTE, G-HZN-041] · blocked by MCP-021 · blocks: S-22
- **What:** one diagnosis surface distinguishing transport failure from server failure from board failure: a CLI (`node …/doctor.mjs --json` or `kanmer tunnel doctor`) + a `connector` block reachable to the GUI — endpoint/tunnel id, expiry, last successful probe, last identity returned, transport/auth/server/board status, recommended repair. Never silently reconnect to a different board.
- **Why:** the original remote failure mode was an HTTP 404 that `get_status` could never see because the transport never reached the server.
- **Verification:** doctor correctly classifies: tunnel down, auth wrong, server down, board missing.

#### S-20 · [core, chore] Tag-push release verification workflow
- groups: [G-HZN-041] · relates GUI-092, GUI-093
- **What:** `.github/workflows/release.yml` on tag push: `npm ci && npm run verify && npm run dist:check`, then `verify-release-assets.mjs <version>` against the published release once assets exist. CI validates; `release.mjs` remains the publisher.
- **Why:** three consecutive releases (0.3.0–0.3.2) shipped broken with green logs; AGENTS.md §11 names a tag-push workflow "the real fix"; releases are cut from one laptop.
- **Verification:** workflow green on the next tag; a deliberately incomplete draft release fails it.

#### S-21 · [docs, chore] Remote access manual: provider-neutral chapter
- groups: [G-REMOTE, G-HZN-041] · blocked by S-18
- **What:** `docs/manual/` chapter for remote access: the HTTP endpoint + token flow, the provider-neutral adapter model with cloudflared as the named-tunnel implementation, the independent OpenAI Secure MCP Tunnel stdio workflow from DOC-010, generic MCP-client guidance, and troubleshooting via the doctor. Regenerate the in-app manual (`build-manual.mjs`).
- **Verification:** `npm run check:manual` green.

#### S-22 · [mcp-server, chore, label integration] Remote access integration verification
- groups: [G-REMOTE, G-HZN-041] · blocked by S-18, S-19, GUI-095
- **What:** end-to-end from a disposable Cloudflare Worker used only as MCP-028's external client: named tunnel up via adapter → bearer-authenticated HTTP → full ticket read/write round-trip → doctor reports healthy → Worker and tunnel test resources torn down with no secrets left on disk.
- **Verification:** proof is the redacted local/Worker interaction and teardown log; this ticket does not create a hosted Kanmer service or require a second machine.

#### S-23 · [gui, feature, docs_todo] Installer-owned launcher shim and its lifecycle
- groups: [G-CODEX, G-HZN-041] · blocks: S-24
- **What:** a fixed, version-independent shim at `%LOCALAPPDATA%\Kanmer\bin\kanmer-mcp.cmd` owned by the installer (created on install, updated in place on upgrade, removed on uninstall), resolving the current install via HKCU and preserving the caller's cwd (ADR-0012 discovery).
- **Why:** Codex registrations today embed machine-specific absolute paths; every update or machine move breaks them. Source material: archived GUI-094's research/plan (kept on its ticket).
- **Verification:** shim survives an app update; uninstall removes it; cwd preserved.

#### S-24 · [gui, feature, docs_todo] Codex Connect registers through the shim
- groups: [G-CODEX, G-HZN-041] · blocked by S-23 · blocks: S-26
- **What:** the codex provider's registration writes one byte-identical, machine-portable entry (`cmd.exe /c` + the fixed shim path form) instead of the current absolute `process.execPath`; disconnect cleans exactly what connect wrote; existing machine-specific entries are drained on next connect.
- **Verification:** provider tests assert byte-identical registrations across two simulated machines; drain covered.

#### S-25 · [gui, feature, docs_todo] Portable registration packaging and real-host verification
- groups: [G-CODEX, G-HZN-041] · blocked by S-24 · blocks: S-26
- **What:** installer (NSIS) carries the shim; `check-updater-package.mjs` extended to assert it; real-host proof on a packaged install: register → update the app → agent session still connects.
- **Verification:** `dist:check` green including the new assertion; real-host log attached as proof.

#### S-26 · [gui, chore, label integration] Portable Connect integration verification
- groups: [G-CODEX, G-HZN-041] · blocked by S-24, S-25
- **What:** end-to-end on a packaged build: fresh install → codex registration → app update → registration still byte-identical and live → uninstall cleans up. Docs/migration note for existing users (one reconnect).
- **Verification:** command log + registry/file listings as proof.

**Existing tickets regroomed into 0.4.1:** MCP-021 (anchor, rescoped: tunnel **adapter contract** + first adapter cloudflared; OpenAI Secure MCP Tunnel remains an independent OpenAI-managed stdio path documented by DOC-010, not a cloudflared adapter — blocked by S-16, S-17; blocks GUI-095, S-19); GUI-095 (tunnel lifecycle UI; blocked by MCP-021); MCP-020 (dispatch over MCP — in the horizon, **not** in G-REMOTE: separate authorization boundary); MCP-014 (grok plugin install); MCP-015 (Antigravity plugin + dispatch, gated on GUI-073 adjudication); MCP-008 (rescoped: headless serve + `.mcpb` for Claude Desktop; **unblocked** from archived MCP-005; relates S-17); GUI-075 (per-provider dispatch model + prompt); GUI-092 + GUI-093 (release rail single-pack + resilient publish; relate S-20); GUI-090 (staleness report in the GUI); GUI-084 (notification wording/theme); GUI-087 (friendly gate errors — the dead `friendlyGateError` never matches; make every gate refusal human); GUI-088 (managed AGENTS.md block for marketplace hosts too); DOC-008 (README corrections); DOC-009 (AGENTS.md repo-map corrections); GUI-068 (update-path verification — needs the next release; re-horizoned here); DOC-010 (independent OpenAI Secure MCP Tunnel stdio path; stays a G-REMOTE member for that manual, not a cloudflared adapter).

### 6.4 Horizon 0.5.0 — new seeds

#### S-27 · [skills, feature, docs_todo] Conduct canon enters the AGENTS.md managed block
- groups: [G-AGENTS, G-HZN-050] · blocks: S-31
- **What:** `scripts/agents-block-body.mjs` gains a compact "Agent conduct" section — the §4 canon, one line per rule; `verify-agents-block.mjs` e2e updated; `kanmer-setup` refresh distributes it; `get_status.repo` hash-staleness flags outdated blocks in every connected repo.
- **Verification:** `npm run verify:agents-block` green; a repo with the old block reports `behind`.

#### S-28 · [skills, feature, docs_todo] kanmer-setup reconciles an AGENTS.md skeleton
- groups: [G-AGENTS, G-HZN-050] · blocks: S-31
- **What:** setup ensures the target repo's AGENTS.md contains the required sections (§commands, §architecture map, §conventions, §gotchas, §verification) outside the managed block: absent file → create from template with TODO markers and file a docs ticket; present file → report missing sections only. Kanmer never rewrites human prose outside its block.
- **Verification:** disposable-repo runs: no file / partial file / complete file each behave as specified; idempotent.

#### S-29 · [docs, chore] Canonical AGENTS.md template + authoring guidance
- groups: [G-AGENTS, G-HZN-050]
- **What:** the template S-28 instantiates, as a kanmer-docs asset, with authoring guidance per section (what belongs in gotchas vs conventions; keep §commands a table; verification checklist is deterministic-first).
- **Verification:** template lint-clean; kanmer-docs references it.

#### S-30 · [skills, chore] Work-type brief templates: fix, UI/UX, docs, cloud/infra, data/migration
- groups: [G-AGENTS, G-HZN-050]
- **What:** five optional overlay templates as kanmer-plan assets the planner copies into a brief when the work matches: **fix** (reproduction, root cause, regression boundary, negative test); **UI/UX** (loading/empty/error/disabled/success states, keyboard + accessibility, responsive constraints, visual proof, no unrelated redesign); **docs** (audience, source of truth, claims changed, examples executed, version sensitivity); **cloud/infra** (tenant/subscription/environment, least-privilege identity, IaC diff, plan/dry-run output, cost impact, rollback, no secrets); **data/migration** (up + down, backfill, runtime-role permission test, grants ride the diff, rollback/data-loss analysis).
- **Why:** domain coverage via templates, never engines — each line maps to an observed Pegasus failure or a standing risk.
- **Verification:** assets exist; kanmer-plan names when to reach for them.

#### S-31 · [skills, chore, label integration] AGENTS.md ownership integration verification
- groups: [G-AGENTS, G-HZN-050] · blocked by S-27, S-28
- **What:** on a disposable repo: kanmer-setup produces block + canon + skeleton; tampering with the block flags `behind`; re-run is a no-op; removing Kanmer removes the block and leaves human prose intact.
- **Verification:** command log as proof.

#### S-32 · [docs, chore] Lean greenfield playbook
- groups: [G-AGENTS, G-HZN-050]
- **What:** a short `docs/` playbook for starting new projects under Kanmer: pick depth (lean / standard / high-assurance), write the one-page brief + non-goals, build the walking skeleton before any generalized framework, detail only the first horizon, replan after the first real release. Explicitly anti-sprawl: no lifetime backlog before the skeleton reveals wrong assumptions.
- **Verification:** referenced from kanmer-setup's greenfield interview step.

#### S-33 · [skills, fix] kanmer-groom gains a board-vs-reality sweep
- groups: [G-HZN-050]
- **What:** a groom step that checks open backlog/preparing tickets against `main`'s history for work that already shipped (search commits/PRs for the ticket id and its subject), proposing outcome-note + archive or rescope.
- **Why:** Kanmer's own board carried CORE-028 (shipped via PRs #57/#59, rail already on main) and GUI-076 (assets landed in `9ec7741`) as open backlog items; Pegasus diverged board-vs-reality catastrophically.
- **Verification:** sweep on the current board flags the known cases and nothing else.

**Existing tickets regroomed into 0.5.0:** CORE-026 (sources declaration — keeps `docs_todo`, needs its FRD first); CORE-027 (browser-safe core subpath export); CORE-029 (AGENTS.md §4 stage-count fix + point `verify-skill-prose` at AGENTS.md); CORE-030 (staleness fix strings derived from providers.ts); GUI-077 (native title-bar theme); GUI-082 (styles.css audit); GUI-091 (Electron screenshot spike); GUI-076 (rescoped: wire the already-committed assets into installer/app/README); GUI-081 (**decision applied — withdraw**: retitled *Withdraw FRD-024 R4's gate-block help clause and amend the FRD* [chore]; GUI-087 + the Manual carry help); SKILL-015 (**decision applied — delete**: retitled *Delete the four pr-* review assets* [chore]).

### 6.5 Groom actions (exact, enumerated)

Applied by the reconciler after all seeds exist. Every action is one tool call; anything not listed is untouched.

| # | Action |
|---|---|
| GA-01 | `update_group HZN-004 title: "0.4.0 — Compiled workflow spine"` |
| GA-02 | `update_group HZN-001 archived: true` (all members done — dead label) |
| GA-03 | `update_group HZN-002 archived: true` (same) |
| GA-04 | `update_item GUI-068 groups: [G-HZN-041]` (out of HZN-003; needs the next release + a human) |
| GA-05 | `update_group HZN-003 archived: true` (after GA-04; its `run.md` history is retained) |
| GA-06 | `update_item CORE-024 profile: fix, title: "Implement kanmer check-pr — ticket linkage and open-questions merge gate (phase 1)"`, body replaced with the implementation contract: read-only `KanmerStore` on a fetched `kanmer-board` worktree (never `init()`); reuse `countCheckboxes(stopAtParked)`; ticket resolution = PR-body footer `Kanmer: <ID>`, else branch `/^([A-Z0-9]{2,6}-\d+)/i`, else **fail** `NO_TICKET`; parked questions pass; board fetch failure fails closed; `evaluateMergeGate` lives in `packages/core/src/merge-gate.ts`, CLI `packages/mcp-server/src/check-pr.mjs`; JSON on stdout, `::error::` workflow commands on stderr; GHA job `kanmer-gate` in the existing workflow; groups [G-SPINE, HZN-004] |
| GA-07 | `update_item CORE-025 profile: fix, title: "Expand kanmer/gate — stage, dependency, review-SHA and commit-reachability checks (phase 2)"`, body replaced: `WRONG_STAGE` fail (ticket not in review); `DEPENDENCY_BLOCKED` fail via the link graph's derived `blockedBy` (never `computeBlockedIds` — wrong direction); `STALE_REVIEW` warn (scratch/review `head_sha` ≠ PR head); `NO_REVIEW_RECORD` warn; **`COMMITS_UNREACHABLE`** warn→fail later (every SHA in ticket `commits[]` reachable from the PR base — kills the zero-diff/unreachable-SHA class); groups [G-SPINE, HZN-004] |
| GA-08 | `update_item MCP-005 archived: true` + body Outcome note: premise refuted by measurement (HZN-003 run.md — the lock is the Electron binary, not the `.cjs`; relocating the script fixes nothing); superseded by G-CODEX (shim) and the MCP-008 rescope |
| GA-09 | `link_items MCP-005 → MCP-008 remove rel: blocks`; `update_item MCP-008 groups: [G-HZN-041]` + body rescope: headless board serve + `.mcpb` bundle for Claude Desktop; no dependency on relocating the runtime; relates S-17 |
| GA-10 | `update_item CORE-028 archived: true, labels: [shipped-ownerless]` + body Outcome note: shipped via PRs #57/#59; rail = `scripts/check-doc-numbering.mjs` (on main with tests) |
| GA-11 | `update_item GUI-076 groups: [G-HZN-050]` + body rescope: assets committed in `9ec7741`; remaining scope is wiring them into installer/app/README |
| GA-12 | `update_item GUI-081 profile: chore, title: "Withdraw FRD-024 R4's gate-block help clause and amend the FRD", groups: [G-HZN-050]` + body decision note (owner 2026-08-20: withdraw; GUI-087 + Manual carry help) |
| GA-13 | `update_item SKILL-015 title: "Delete the four pr-* review assets", groups: [G-HZN-050]` + body decision note (owner 2026-08-20: delete per FRD-023 R1; review lives in scratch) |
| GA-14 | `update_item GUI-094 archived: true` + body pointer: split into G-CODEX (S-23…S-26); research/plan on this ticket remain the source material |
| GA-15 | `remove_column kind: area, id: pr-review` (zero tickets; dead area) |
| GA-16 | Membership sweep — `update_item groups:` per §6.2–6.4 assignments: HZN-004+G-SPINE → CORE-024, CORE-025, MCP-017, MCP-018, MCP-019, GUI-085 (+ SKILL-016/017 gain G-SPINE, keep HZN-004); G-HZN-041 → MCP-021(+G-REMOTE), GUI-095(+G-REMOTE), DOC-010(+G-REMOTE), MCP-020, MCP-014, MCP-015, MCP-008, GUI-075, GUI-092, GUI-093, GUI-090, GUI-084, GUI-087, GUI-088, DOC-008, DOC-009, GUI-068; G-HZN-050 → CORE-026, CORE-027, CORE-029, CORE-030, GUI-077, GUI-082, GUI-091, GUI-076, GUI-081, SKILL-015 |
| GA-17 | `update_item MCP-021 title: "Tunnel adapter contract + cloudflared adapter", groups: [G-REMOTE, G-HZN-041]` + body rescope: define the adapter contract (create/start/stop/status/url) against FRD-025; implement cloudflared as the first adapter; the OpenAI Secure MCP Tunnel remains an independent OpenAI-managed stdio path documented by DOC-010, not a cloudflared adapter |
| GA-18 | `create_item` DOC ticket *"MASTERPLAN.md adopted as the roadmap source of truth"* directly in `done`, `profile: custom`, `commits: [<adoption commit SHA>]`, body: backfill record — replaces the two root design documents; seed catalog + canon + horizons live in MASTERPLAN.md |

Dependency edges to create (stored on the blocker): S-01→S-02→{S-03, CORE-024}; GUI-085→S-03; S-05→S-06; S-06→{S-09, S-15}; S-07→S-09; S-11→S-12; S-03→S-15; S-09→S-15; CORE-025→S-15; S-16→{S-17, MCP-021}; S-17→{S-18, MCP-021}; MCP-021→{GUI-095, S-19}; S-18→{S-21, S-22}; S-19→S-22; GUI-095→S-22; S-23→S-24→{S-25, S-26}; S-25→S-26; S-27→S-31; S-28→S-31. (CORE-024→CORE-025 and SKILL-016→SKILL-017 already exist.)

## 7. Execution and learning protocol

**Ticket creation (this adoption):** a dynamic workflow of **Sonnet 5 agents exclusively** transcribes §6 onto the board — groups first (one agent), then authors partitioned **by area** (ticket-ID counters are per-prefix; partitioning removes allocation races), then per-area verifiers, then one reconciler for links + groom actions, then a board-level verifier. Fable reviews every created and mutated ticket directly. The principle: **the planner resolves every decision; the transcriber invents nothing.** Agents search before creating (duplicate safety), touch only what their seed list names, and stop at their list.

**Implementation:** ticket-first through the shipped pipeline (research/plan per profile gates → execute in `.worktrees/<id>` → PR with `Kanmer: <ID>` footer → review → merge → exact-SHA verify → done). 0.4.0 order is dependency-driven: S-01 → S-02 → GUI-085 → S-04 (parallel-safe) → protection (S-03) after `verify` is green twice → CORE-024 → onward. Sonnet implements; Fable reviews every PR until the gate is live.

**Learning loop:** every correction Fable makes to agent work is classified — *seed-ambiguity* (the brief under-specified; fix the template), *convention-miss* (the skill/canon under-taught; fix the skill), *hallucination* (invented fact/API; tighten the packet), *scope-creep* (canon rule 1–5 violated; tighten the stop condition) — and appended to §9. Only **systemic** classes become guardrail tickets; this section is a steering signal, not a mistake corpus.

## 8. Deferred quarry (promotion requires observed failure + named owner)

Expiring leases/heartbeats and a `ticket_workspace` tool · automatic risk-overlay detectors (templates exist instead) · role-scoped MCP binaries · `board.yml` profile materialization (needs an ADR-0014 amendment) · hard content-gates on checklist tags or typed PASS/FAIL (needs ADR-0011/0005 amendments) · `pr-merged` pseudo-requirement on `enter-verifying` · GitHub App + Checks-API annotations · merge queue · frozen RC manifests · golden-board eval harness + workflow metrics · idempotency keys / batch resume · duplicate-candidate warning on create · merge-time P1/P2 severity policy · OAuth for remote auth · multi-board endpoints · additional Connect hosts beyond measured demand.

## 9. Learnings

*(Appended by the execution protocol.)*

**2026-08-20 — seed-transcription run** (13 Sonnet agents: groups → 5 per-area authors → 5 per-area auditors → reconciler → board audit; 327 tool calls). Result: 6 groups, 34 tickets (33 seeds + DOC-016 backfill), 31 edges, groom GA-01…GA-18 — **zero Sonnet execution defects**; every correction was planner-side. Seed→id map: S-01…S-04,S-15,S-20 → CORE-031…036; S-05…S-07,S-17…S-19,S-22 → MCP-022…028; S-11…S-13,S-23…S-26 → GUI-096…102; S-08…S-10,S-27,S-28,S-30,S-31,S-33 → SKILL-020…027; S-14,S-16,S-21,S-29,S-32 → DOC-011…015.

| # | Class | What happened | Fix |
|---|---|---|---|
| L-01 | seed-ambiguity (planner) | Six seed bodies cross-referenced other seeds by catalog key (`S-xx`) with no resolution rule; authors correctly transcribed verbatim, landing planner-namespace keys on the board (DOC-011/012/014, MCP-024/025, GUI-098). | Fable resolved them to allocated ids post-hoc. Catalog rule going forward: ticket-visible text names real ids only, or the catalog gives the reconciler an explicit key-resolution step. |
| L-02 | seed-ambiguity (planner) | GA-14 said "body pointer" without placement; the compiled work order chose PREPEND, leaving GUI-094 inconsistent with MCP-005/CORE-028 (notes under `## Outcome`). The board audit flagged it. | Note moved under `## Outcome`, with the four split-ticket ids added. Rule: closeout-type notes on archived tickets go under Outcome. |
| L-03 | convention-miss (planner compilation; zero board impact) | The compiled reconciler order rendered GUI-081's title with a typographic apostrophe where MASTERPLAN uses a straight one; the reconciler and audit anchored to the file, so the board matched the source and the audit surfaced the prompt drift. | No board fix needed. Protocol rule confirmed: audits anchor to the source document, never to the compiled prompt — that anchoring is what caught the drift. |

---

## Appendix A — Spine implementation notes (verified specifics preserved from the superseded spec)

These constraints were verified against the code on 2026-08-20 and are load-bearing for the seeds that cite them. Line numbers drift; re-verify at implementation.

**VERIFY_STEPS (S-01):** one exported array consumed by both `npm run verify` and `release.mjs`; the release rail changes (order flips, `smoke:discovery` added, duplicate `check:manual` dropped — it already runs inside `npm test`). `plugin:check` refuses inside a linked worktree (MCP-007) — CI clones the PR branch as the main working tree, so it is valid there; never run `plugin:build` in CI.

**GHA (S-02, CORE-024):** default shell on `windows-latest` is PowerShell — set `defaults.run.shell: bash` so `$RUNNER_TEMP`/`$GITHUB_EVENT_PATH` expand consistently. The gate job fetches the **board branch** (`git fetch origin kanmer-board` + `git worktree add "$RUNNER_TEMP/kanmer-board" origin/kanmer-board`) — `check-pr --board` must never point at the PR tree. Event mapping: `pull_request.number/head.sha/head.ref/body` → gate input; missing `pull_request` in the payload exits 2 (check could not run) — distinct from exit 1 (check failed). Drafts are checked like any PR. Never rename jobs after protection is on — GitHub matches by name; record the UI's check-name string in the playbook after the first green run.

**Merge gate (CORE-024/025):** instantiate `KanmerStore` read-only on the fetched board — calling `init()`/`ensureInit()` would write a skeleton into the CI worktree. One checkbox parser: core's `countCheckboxes(…, {stopAtParked: true})`. Dependency direction: `getLinkGraph(id).blockedBy` filtered to non-done, non-archived — **not** `computeBlockedIds` (that returns blocked targets, the opposite direction). Area prefixes are alphanumeric (`/^[A-Z0-9]{2,6}$/`) — the branch regex must accept digits.

**Fingerprint (S-05):** payload is exactly `{boardRoot, format, repoRoot}` in that key order, resolved paths, POSIX slashes, lowercase drive letter, no trailing slash; prefixed `kanmer-proj-v1:`. `boardSource` is displayed, never hashed (hashing it would invalidate in-flight tokens across greenfield `create_item` init and board repairs). `detectFormat()` is async and returns `1|2|3`, never null. Absolute paths make the fingerprint machine-local by design — it is a session token, not a portable repo id.

**Write plumbing (S-05):** current `write()` calls `ensureInit()` then the handler; capture the fingerprint **before** `ensureInit()`. `update_item` spreads its patch into the store and `serialiseItem` preserves unknown keys — strip `expected_project` before the store or it lands in ticket YAML. Zod raw shapes drop undeclared keys and MCP schemas are `additionalProperties: false` — the field must be declared per write tool (`withProject()` helper); `create_items` declares it at call level only. Old servers (0.3.3 packaged) reject unknown keys — clients sniff `get_status.compat.expectedProject` and omit when absent.

**Packet (S-06):** bare `getDocWithVersion(id, "plan")` resolves the folder index (`plan/plan.md`); extra files under a type are listed path+version only. Refusal order is fixed and spike **dominates** (do not also evaluate gates for a spike). Occupancy refusal reuses the take-refuse message shape with `missing: []` — no new `LEASE_HELD` code. `custom: {}` tickets with no declared boundaries succeed with whatever docs exist — skills, not the packet, decline to dispatch those.

**Records (S-07):** `append_scratch` is an append — it cannot rewrite frontmatter; attestations are whole-file `set_ticket_doc` replaces. `plan_hash` = content-version of `plan/plan.md` (16-hex sha256 prefix — same token `get_ticket_doc` returns), never a folder concatenation. Proof-with-FAIL still satisfies the existence gate — verify-skill choreography, not a content gate, prevents moving on a FAIL.

**Board worktree (S-04):** the guard refuses *recording* the board path; it cannot stop raw `git -C .worktrees/kanmer checkout` (core spawns no git). The health block is what makes that class visible; repair remains an ops procedure. GUI main and mcp-server each keep their own ~20-line inspect helper, commented as a pair.

**Editor (S-11/S-12):** there is no scratch tab or group-context pane today — build them before the mode enum; modes select starting tabs over the same files, never a fourth view (Board/Standup/Archived stay the only views; the Backlog view was deliberately removed by GUI-070).

**Plugin bundle:** any PR that changes the MCP tool surface rebuilds `plugins/kanmer/mcp/kanmer-mcp.cjs` **from the main checkout** and updates `tool-reference.md` (rows above `## Field semantics`), or `plugin:check`/`check-plugin-sync` fails. Skill-only PRs need no bundle rebuild.

**PR #64 / DOC-010:** the board-worktree half of its hold condition is satisfied (repair done); the remaining condition is dispositioning its 6 review comments before merge. The tunnel doc's sharp edges: forward slashes mandatory even on Windows (tunnel-client 0.0.11 escape parsing); one tunnel/profile/app per project; distinct `health.listen_addr` per concurrent profile; the bundled cloudflared is a pinned companion, not a provider-neutral endpoint.
