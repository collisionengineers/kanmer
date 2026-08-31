# Plan — CORE-127: enforce constrained step packets against actual worker changes

## Objective

Extend the existing constrained step-packet and read-only reconciliation surfaces so the controller can prove that one worker step stayed inside its authorised paths and current evidence before another packet is issued. Missing or unreadable facts are inconclusive, not PASS. No new tool, write authority, workflow stage or persisted board contract is introduced.

## Starting state

- Preparation audit base: `origin/main` `c1bc3be8532150832328a6d7f62ecd94cdcf6220`. Implementation starts only after CORE-126 merges, then rebases onto and records that exact merge base before any source edit.
- Evidence: `research/research.md`@`3ee113c0c88072d9`, `files/files.md`@`d975dd2947206d8f`, `HZN-008/context.md`@`354c57fe272f7d7f`.
- `normalisePlanPath` does not confine paths; forbidden globs use exact membership; live evidence pins need not match.
- `step-packet/1` has no checklist snapshot or workspace baseline and its canonical digest has no public verifier.
- `workspaceEvidence` discards changed paths, while `reconcile_ticket` accepts only an id.
- `get_execution_packet step:"next"` advances from checklist state without reconciling the prior exact packet.

## Governing docs

- `docs/functional/frd/FRD-033-constrained-preparation-and-step-packets.md`: enforces actual file bounds, current evidence and one-step controller reconciliation.
- `HZN-008/context.md`: preserves stable-v0.3.12 board control, the existing six stages, central TypeScript engine, one active writer and bounded controller behavior.
- [[CORE-118]]: reuse `parsePlan`, `validatePlan`, `compileStepPacket` and the existing packet/tool surface.
- [[CORE-122]] / [[CORE-131]]: keep `reconcile_ticket` read-only and do not add a new `ReconciliationAction` or apply authority.
- CORE-126 final batch manifest/workspace projection is the source of truth after rebase; do not duplicate it.

## Required changes

1. **Confine every declared and observed path**
   - Replace permissive path cleanup with one typed repository-relative parser used by plan tables, step fields, evidence paths and observed Git paths.
   - Accept normal relative paths after slash normalization and a single leading `./`; reject empty/dot, NUL, parent traversal, POSIX absolute, drive/UNC, URI/URL and unsupported pattern forms.
   - Implement one dependency-free matcher for literal paths, `*` within one path segment and `**` across segments. Treat regex metacharacters literally. Use it for both allowed and forbidden classification.
   - Correct live-evidence validation: every required research/files entry must have a matching current pin; unknown pins do not satisfy the requirement.

2. **Version and validate the exact packet**
   - Bump the wire contract to `step-packet/2`; refuse v1 rather than pretending it contains the new evidence.
   - Add a checklist block carrying the exact path/version and issuance-time step states.
   - Add a bounded workspace baseline carrying the exact branch, HEAD and canonical dirty-entry snapshots. Each entry preserves path, index/worktree state and content identity so a second change to a previously dirty path is detectable.
   - Export one canonical packet verifier/parser and digest check; a caller-supplied `packetId` is never trusted by itself.
   - Add a pure typed classifier returning `pass | fail | inconclusive`, changed paths, allowed/forbidden/undeclared classifications and stale/deviation findings.

3. **Collect reproducible workspace/evidence facts**
   - Add one focused MCP helper reused by `get_execution_packet` and `reconcile_ticket`.
   - Validate the recorded worktree against the source Git common directory and exact recorded branch; detached, foreign or branch-mismatched workspaces refuse.
   - Capture bounded NUL-delimited porcelain status with all untracked files. Preserve both rename endpoints and spaces/Unicode. Fingerprint index/worktree/untracked state without following paths outside the repository.
   - Treat missing/inaccessible worktrees, malformed Git output, timeout/output overflow, unsupported file forms and snapshot drift as inconclusive.
   - Re-read plan, research, files, checklist and group context around a document-inclusive revision sample; accept only a stable bounded snapshot.

4. **Extend the two existing read-only tools**
   - `reconcile_ticket` gains optional `step_packet` containing the complete exact packet. It appends the typed step result while leaving the existing delivery/claim recommendation unchanged and writes nothing.
   - `get_execution_packet` issues a constrained packet only from a proven recorded workspace/branch. Step 1 needs no prior packet; any later numeric step and `"next"` resolving beyond step 1 require `prior_step_packet`.
   - Reuse the same classifier. A prior FAIL or INCONCLUSIVE refuses the new packet. PASS captures the current accepted snapshot as the next baseline.
   - Numeric selection of an already completed step refuses. The authorised checklist step must be complete at reconciliation, and later step states must not advance.
   - Whole-ticket packets remain the untaken/setup compatibility route; no call takes, moves, writes, dispatches or creates a worktree.

5. **Update the canonical operating contract and bundle**
   - Update AGENTS, plan/execute/auto skills and the tool reference with supported path syntax, exact packet hand-off, no-next-packet rule and inconclusive behavior.
   - Pin those instructions in the existing skill-prose verifier without weakening any current assertion.
   - Regenerate the committed standalone MCP bundle. Tool count remains 41.

## Expected files

| Action | Repo-root-relative path | Responsibility |
|---|---|---|
| Modify | `packages/core/src/plan.ts` | Strict path parser, glob matcher and evidence-pin validation |
| Modify | `packages/core/src/plan.test.ts` | Plan path/glob/evidence tests |
| Modify | `packages/core/src/step-packet.ts` | v2 packet, verifier and pure step reconciliation |
| Modify | `packages/core/src/step-packet.test.ts` | Packet and classifier tests |
| Add | `packages/mcp-server/src/step-reconciliation.ts` | Git/evidence snapshot collector |
| Add | `packages/mcp-server/src/step-reconciliation.test.mjs` | Collector fixture tests |
| Modify | `packages/mcp-server/src/execution-packet.ts` | Stable issuance and prior-packet gate |
| Modify | `packages/mcp-server/src/reconciliation.ts` | Optional packet-aware inspection |
| Modify | `packages/mcp-server/src/reconciliation.test.mjs` | Inspector integration/no-write tests |
| Modify | `packages/mcp-server/src/index.ts` | Existing tool schemas and descriptions |
| Modify | `packages/mcp-server/src/smoke.mjs` | End-to-end constrained-step tests |
| Modify | `AGENTS.md` | Canonical operating contract |
| Modify | `plugins/kanmer/skills/kanmer-plan/SKILL.md` | Supported path/pattern syntax |
| Modify | `plugins/kanmer/skills/kanmer-execute/SKILL.md` | Exact packet return contract |
| Modify | `plugins/kanmer/skills/kanmer-auto/SKILL.md` | Controller reconciliation ordering |
| Modify | `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | Tool input/output contract |
| Modify | `scripts/verify-skill-prose.mjs` | Prose pins |
| Modify | `scripts/verify-skill-prose.test.mjs` | Prose regression tests |
| Regenerate | `plugins/kanmer/mcp/kanmer-mcp.cjs` | Shipped standalone bundle |

## Do not modify

- `packages/core/src/store.ts`, batch sidecars, merge-gate code or lease ownership.
- CORE-133 abandoned-workspace recovery or FAIL proof routing.
- CORE-129 proof schema/consistency behavior.
- `apps/gui/**`, governing documents, release/delivery records, workflow stages or dependencies.
- The board worktree by hand or any existing assertion merely to make a check pass.

## Constraints

- The complete packet, not an id alone, is the evidence input. Validate its shape and recompute its canonical digest before any field is used.
- Baselines are bounded facts, not persisted server state. Do not add a packet database, journal, watcher or global scheduler.
- Git observation is read-only and repository-confined. No command comes from caller input.
- `reconcile_ticket` remains advisory; `apply_reconciliation` gains no step-packet mutation.
- A missing/unreadable fact is `inconclusive`; only a fully proved result is `pass`.
- The stable board remains readable by v0.3.12: no new frontmatter field, board format or migration.
- Preserve exact batch authority and workspace identity from the CORE-126 merge.
- No dependency addition and no secret value in source, fixtures, docs, logs or proof.

## Ordered steps

### Step 1 — Harden plan path and evidence validation

- Preconditions: branch is rebased on the exact CORE-126 merge and the recorded worktree/common directory match the ticket.
- Files: `packages/core/src/plan.ts`, `packages/core/src/plan.test.ts`
- Symbols: `normalisePlanPath`, `evidenceFindings`, `stepFindings`, new strict path parser and matcher
- Change: implement Required change 1 with typed failures and one shared matching contract.
- Preserved behaviour: benign repo-relative paths and existing literal allowed/forbidden entries keep their normalized values.
- Forbidden: filesystem/Git/store access or accepting an unsupported pattern as a literal.
- Negative cases: traversal, absolute/drive/UNC/URI/NUL/empty/dot; `apps/gui/**`; segment-local `*`; regex metacharacters; literal prefix confusion; unknown and missing live pins.
- Tests: `packages/core/src/plan.test.ts`
- Commands: `npm exec --workspace @kanmer/core -- vitest run src/plan.test.ts --no-file-parallelism`, `npm run typecheck -w @kanmer/core`
- Expected output: all plan tests pass and invalid authority is a blocking typed finding in step mode.
- Done when: compile-time allowed/forbidden/evidence inputs are repository-confined and matched consistently.
- Deviation stop: if the documented `*`/`**` subset cannot express a current plan, report the exact live consumer before widening syntax.

### Step 2 — Add the v2 baseline and pure classifier

- Preconditions: Step 1 passes.
- Files: `packages/core/src/step-packet.ts`, `packages/core/src/step-packet.test.ts`
- Symbols: `STEP_PACKET_VERSION`, `StepPacket`, `compileStepPacket`, packet verifier/digest, workspace snapshot types, step reconciliation result
- Change: implement Required change 2 and reject completed numeric selections.
- Preserved behaviour: v2 retains all v1 worker instructions and deterministic identity; whole-ticket response behavior is unchanged.
- Forbidden: filesystem/store reads, persisted packet state or silent v1 normalization.
- Negative cases: malformed/tampered packet; wrong version/digest/identity; changed pre-dirty path; allowed/forbidden/undeclared rename endpoints; stale evidence; unticked selected step; later-step advance.
- Tests: `packages/core/src/step-packet.test.ts`
- Commands: `npm exec --workspace @kanmer/core -- vitest run src/step-packet.test.ts --no-file-parallelism`, `npm run build:core`
- Expected output: deterministic v2 packet tests and pure reconciliation matrix pass.
- Done when: identical facts produce identical packet IDs and only complete conclusive evidence produces PASS.
- Deviation stop: if the classifier needs host I/O, keep that I/O in the MCP helper rather than weakening purity.

### Step 3 — Collect bounded Git and document snapshots

- Preconditions: Step 2 passes and core is built.
- Files: `packages/mcp-server/src/step-reconciliation.ts`, `packages/mcp-server/src/step-reconciliation.test.mjs`, `packages/mcp-server/src/execution-packet.ts`
- Symbols: workspace snapshot capture, stable evidence snapshot, `getExecutionPacket`
- Change: implement Required change 3 and feed the proven baseline/checklist/evidence into v2 compilation.
- Preserved behaviour: existing worktree common-directory, board-worktree, batch actor and resume refusals retain precedence.
- Forbidden: mutation, unbounded output, shell interpolation, symlink escape or a second workspace identity rule.
- Negative cases: missing/EACCES/timeout/overflow/foreign/branch/detached; rename pair; untracked; spaces/Unicode; concurrently changed document revision.
- Tests: `packages/mcp-server/src/step-reconciliation.test.mjs`
- Commands: `npm run build:server`, `node --test packages/mcp-server/src/step-reconciliation.test.mjs`
- Expected output: fixture snapshots are deterministic and every unprovable path is inconclusive/refused.
- Done when: constrained issuance cannot occur without exact recorded workspace and stable evidence facts.
- Deviation stop: if Windows Git cannot provide the required NUL-delimited facts, record the exact command/output and stop before inventing a parser fallback.

### Step 4 — Wire exact reconciliation before next issuance

- Preconditions: Step 3 passes.
- Files: `packages/mcp-server/src/reconciliation.ts`, `packages/mcp-server/src/reconciliation.test.mjs`, `packages/mcp-server/src/execution-packet.ts`, `packages/mcp-server/src/index.ts`, `packages/mcp-server/src/smoke.mjs`
- Symbols: `reconcileTicket`, `getExecutionPacket`, the existing `reconcile_ticket` and `get_execution_packet` registrations
- Change: implement Required change 4.
- Preserved behaviour: without optional packet inputs both tools retain their current result/refusal ordering; the 41-tool roster and read-only annotations are unchanged.
- Forbidden: a new tool, a new apply action, accepting packet_id alone or treating inconclusive as pass.
- Negative cases: prior packet omitted for step 2; exact prior FAIL/INCONCLUSIVE; stale plan/research/files/group/checklist; wrong project/ticket/batch/workspace; board/ticket/activity byte drift.
- Tests: `packages/mcp-server/src/reconciliation.test.mjs`, `packages/mcp-server/src/smoke.mjs`
- Commands: `node --test packages/mcp-server/src/reconciliation.test.mjs`, `node packages/mcp-server/src/smoke.mjs`, `npm run smoke:protocol`
- Expected output: packet-aware inspection is read-only and the next packet appears only after exact PASS.
- Done when: no server path can issue a later constrained packet from a failed, stale or unavailable prior step.
- Deviation stop: if enforcing order requires persisted controller state, stop; the approved contract uses caller-retained immutable packets and live facts.

### Step 5 — Publish the operating contract and verify the final head

- Preconditions: Steps 1–4 pass.
- Files: `AGENTS.md`, `plugins/kanmer/skills/kanmer-plan/SKILL.md`, `plugins/kanmer/skills/kanmer-execute/SKILL.md`, `plugins/kanmer/skills/kanmer-auto/SKILL.md`, `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md`, `scripts/verify-skill-prose.mjs`, `scripts/verify-skill-prose.test.mjs`, `plugins/kanmer/mcp/kanmer-mcp.cjs`
- Symbols: constrained-plan operating prose, tool rows and generated bundle
- Change: implement Required change 5, regenerate the bundle, run focused checks and the complete non-overlapping Windows rail.
- Preserved behaviour: all pinned existing prose/assertions, tool names and bundle/source identity.
- Forbidden: hand-editing the bundle or weakening a prose/test assertion.
- Negative cases: prose omits full packet, exact prior reconciliation, inconclusive refusal or supported glob subset; stale bundle.
- Tests: skill-prose and plugin identity rails plus complete verification.
- Commands: `npm run test:scripts`, `npm run verify:skills`, `npm run verify:agents-block`, `npm run plugin:build`, `npm run plugin:check`, `npm run typecheck`, `npm run verify`, `git diff --check`
- Expected output: every focused check and the authoritative rail exit 0 at one exact clean head.
- Done when: implementation/report are complete, the branch is pushed, one PR with `Kanmer: CORE-127` is open and the ticket is in Review.
- Deviation stop: any deterministic existing-test regression, tool-count drift, bundle mismatch or file outside this plan requires an evidence-backed plan correction before continuing.

## Acceptance checks

- Invalid or escaping declared paths cannot compile; supported forbidden globs and literal allowed paths classify real Git paths correctly.
- A fixture worker that changes only allowed files passes; forbidden or undeclared changes fail with typed paths.
- A path already dirty at issuance and changed again is detected.
- Tampered/v1/wrong-identity packets refuse before observation is trusted.
- Plan, research, files and group context versions are checked independently; missing/unreadable evidence is inconclusive.
- The selected checklist step must complete and no later step may advance.
- `reconcile_ticket` remains byte-for-byte read-only and retains its existing recommendation behavior.
- Step 2 or `"next"` beyond step 1 cannot be issued without PASS for the exact prior packet.
- Core focused tests, MCP collector/integration tests, smoke/protocol, skills/AGENTS, bundle identity, full `npm run verify`, hosted `verify` and `kanmer-gate` all pass on the same exact head.

## Commands

Run from the recorded CORE-127 worktree after CORE-126 merges:

- `npm ci`
- `npm exec --workspace @kanmer/core -- vitest run src/plan.test.ts src/step-packet.test.ts --no-file-parallelism`
- `npm run build:core`
- `npm run build:server`
- `node --test packages/mcp-server/src/step-reconciliation.test.mjs`
- `node --test packages/mcp-server/src/reconciliation.test.mjs`
- `node packages/mcp-server/src/smoke.mjs`
- `npm run smoke:protocol`
- `npm run typecheck`
- `npm run test:scripts`
- `npm run verify:skills`
- `npm run verify:agents-block`
- `npm run plugin:build`
- `npm run plugin:check`
- `npm run verify`
- `git diff --check`

## Failure and deviation rules

- Fail closed on malformed paths, packet fields, Git output, identity mismatch or unavailable evidence.
- Do not infer authorization from a caller-supplied path, packet id, owner label or stale revision.
- Do not alter CORE-126, CORE-133 or CORE-129 behavior in this PR.
- Do not repeat a full rail after a deterministic result unless the source/authoritative contract changed or a documented transient mechanism requires one bounded retry.
- Stop implementation at Review; independent exact-head review, merge and exact-merge verification are controller phases.

## Stop condition

Stop when the bounded CORE-127 PR is open at one clean exact head, the post-implementation report is current, the board is synced and CORE-127 is in Review. Do not self-review, merge, verify or start CORE-133 from the implementation run.
