# Plan — CORE-127: enforce constrained step packets against actual worker changes

## Objective

Extend the existing constrained step-packet and read-only reconciliation surfaces so the controller can prove that one worker step stayed inside its authorised paths and current evidence before another packet is issued. Missing or unreadable facts are inconclusive, not PASS. No new tool, write authority, workflow stage or persisted board contract is introduced.

## Starting state

- Preparation audit base: `origin/main` `c1bc3be8532150832328a6d7f62ecd94cdcf6220`. Implementation starts only after CORE-126 merges, then rebases onto and records that exact merge base before any source edit.
- Evidence: `research/research.md`@`3ee113c0c88072d9`, `files/files.md`@`9dc7da831b8d1e92`, `HZN-008/context.md`@`354c57fe272f7d7f`.
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
| Modify | `packages/core/src/step-packet.test.ts` | Packet and path/symbol classifier tests |
| Modify | `packages/core/src/store.ts` | Metadata-first bounded execution-authority snapshot from exact board bytes |
| Modify | `packages/core/src/store.test.ts` | Snapshot byte/count/identity/race tests against real files |
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

- Batch sidecars, merge-gate code or lease ownership. In `store.ts`, modify only the bounded read-only execution-authority snapshot seam.
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
- `npm exec --workspace @kanmer/core -- vitest run src/plan.test.ts src/step-packet.test.ts src/store.test.ts --no-file-parallelism`
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

## Root-cause remediation replan — exact review head `fc242c3c8fc8c97d2fbb7c9948af3f7d537c4de7`

The first remediation fixed F-001 through F-005. Exact-head automation and independent review then confirmed F-006 through F-009 as blocking majors. The remediation counter does not authorize a merge through those gaps; this section is the one evidence-based root-cause replan required by the release contract. All four findings share one invariant: every fact used to authorize a worker step must be bounded and bound to the exact object observed before PASS is possible.

### RC-1 — Bound group authority before I/O (F-006)

- Files/symbols: `packages/mcp-server/src/step-reconciliation.ts::documentSample`, `packages/mcp-server/src/execution-packet.ts::groupContexts`, their existing collector/smoke tests.
- Build one canonical unique group-id census before the first group or context lookup. Apply the packet document/array bound up front, including the already counted ticket-document census; an over-limit request returns an ordinary refusal/INCONCLUSIVE result with zero group-context reads.
- Use the same bounded canonical census in both whole-ticket and constrained packet paths. Exact duplicate ids collapse once; a missing or conflicting resolved identity still refuses.
- Negative cases: exactly the limit; limit plus one with no `getGroup`/`getGroupDoc` calls; many duplicates; a missing group after a valid bounded census.

### RC-2 — Charge all path matching work (F-007)

- Files/symbols: `packages/core/src/plan.ts::planPathMatch` and its budget helpers; `packages/core/src/plan.test.ts`; `packages/core/src/step-packet.ts::reconcileStepPacket`; `packages/core/src/step-packet.test.ts`.
- Reject overlong raw values and charge their parsing plus literal equality before doing that work. Charge literal segment comparisons as well as wildcard/KMP work. Once the shared aggregate budget is exhausted, do not parse or compare another declaration.
- Preserve precedence: a proven forbidden match fails; otherwise any unproved forbidden result is INCONCLUSIVE; only then can allowed matching run. A literal Cartesian product that exhausts the budget emits `STEP_PATH_MATCH_INCONCLUSIVE`, never PASS or `STEP_PATH_UNDECLARED`.
- Negative cases: one-operation literal exhaustion; 65,536-character literals; many allowed/forbidden literals across many observed paths; forbidden-unknown precedence over an allowed match.

### RC-3 — Bind file validation and reading to one handle (F-008)

- Files/symbols: `packages/mcp-server/src/step-reconciliation.ts::fileIdentity` plus a focused bounded handle reader; `packages/mcp-server/src/step-reconciliation.test.mjs`.
- Open one read-only handle and compare handle `fstat` with path `lstat` before and after the read using stable device/inode/type/mode/link/size facts. Reject a symlink/reparse substitution, non-regular file, hard link, identity change, shrink or growth.
- Read through that handle with an explicit `MAX_FILE_BYTES + 1`/remaining-total cap rather than `readFile(path)`. Close in `finally`; a short, repeated or over-limit read is INCONCLUSIVE. Keep the existing physical-containment and index-object checks.
- Negative cases: deterministic path replacement between open/validation/read; replacement by symlink where supported; growth beyond the pre-read size and budget; post-read identity change; handle cleanup on refusal.

### RC-4 — Refuse status-hidden tracked files (F-009)

- Files/symbols: `packages/mcp-server/src/step-reconciliation.ts::captureOnce` and bounded Git parsers; `packages/mcp-server/src/step-reconciliation.test.mjs`; canonical AGENTS/execute/auto/tool-reference prose and existing prose pins where the observable-evidence contract is stated.
- Add one bounded NUL-delimited `git ls-files -v -z` census to each sample. Reject lowercase assume-unchanged tags and `S`/`s` skip-worktree tags before a snapshot is accepted; malformed, oversized or timed-out output is INCONCLUSIVE.
- Include the clean flag census in double-sample authority so a flag change between samples cannot be accepted. Do not clear or mutate index flags.
- Negative cases: assume-unchanged predating issuance with a hidden edit; skip-worktree predating issuance; flag introduced or removed between samples; clean ordinary/staged/untracked workspaces remain supported and the index bytes/mtime remain unchanged.

### Root-cause verification and stop

- Focused commands: core plan/packet tests; core and MCP builds; collector tests; reconciliation tests; MCP smoke; protocol; scripts/prose/AGENTS; plugin build and byte check; typecheck; `git diff --check`.
- The committed standalone MCP bundle must be regenerated after source passes. No dependency, new tool, new stage, new board field, database, watcher or persistent packet state is allowed.
- The implementation worker stops after one clean commit on the existing branch and PR. The controller then requires exact-head automated settlement, one independent delta review over F-001 through F-009 and affected callers/tests, one fresh clean Windows `npm run verify`, hosted `verify`, synced-board `kanmer-gate`, merge, and exact-merge verification.


## Second exact-head root-cause remediation — review head `5302e445dc70714e89762dc19fb96754490e3fa9`

After the F-006–F-009 remediation, exact-head automation and a fresh independent delta review confirmed F-010 through F-012 as three remaining majors. F-013 is rejected with reason in the exact-head review record: the retained shared evidence contract binds `<group-id>/context.md`, while the complete group object remains issuance-coherence metadata. No release-roster or governing-contract expansion is authorized.

### RC-5 — Bound the complete glob-language proof (F-010)

- Files/symbols: `packages/core/src/plan.ts` relation-proof helpers and `packages/core/src/plan.test.ts`.
- Reuse one aggregate proof context per `validatePlan` call. Charge alphabet construction, NFA transition scans, epsilon-closure edges, product-state/alphabet work, queue insertion and every move-cache insertion before performing them.
- Deduplicate product states before enqueue and independently bound queue/cache entries. Preserve the canonical equality fast path.
- Exhaustion returns `null` and remains the existing blocking `PLAN_GLOB_COMPLEXITY` result; an exhausted forbidden proof cannot become allowed or undeclared.
- Negative cases: thousands of distinct Unicode literals; many declaration pairs sharing one budget; deterministic cache exhaustion; ordinary containment/intersection retains exact results.

### RC-6 — Fail closed on unprovable symbol authority (F-011)

- Files/symbols: `packages/core/src/step-packet.ts::reconcileStepPacket`, its tests, and the canonical AGENTS/plan/execute/auto/tool-reference prose.
- The current FRD packet carries free-form symbol names without language/parser identity, file mapping, immutable source ranges or AST identities. A generic text/diff heuristic could falsely authorize comments, strings, overloads, nested declarations or unsupported languages.
- Preserve `allowedSymbols` in the immutable packet. When actual changes exist and that list is non-empty, emit typed `STEP_SYMBOL_SCOPE_INCONCLUSIVE`; forbidden or undeclared path failures retain precedence and are never masked. Empty-symbol packets explicitly authorize at file scope and retain the existing PASS path. No worker summary becomes proof.
- Negative cases: an allowed file with non-empty symbols is INCONCLUSIVE; text mentioning an allowed name does not authorize it; forbidden/undeclared paths still FAIL; empty-symbol file-scoped packets still PASS; no actual change creates no symbol finding.
- A future mechanical symbol PASS would require a separately versioned language/parser plus immutable range/AST contract. It is not invented inside this release remediation.

### RC-7 — Cap board evidence before allocation (F-012)

- Files/symbols: `packages/core/src/store.ts::KanmerStore.getExecutionAuthoritySnapshot` with focused private inventory/handle helpers; `packages/core/src/store.test.ts`; `packages/mcp-server/src/step-reconciliation.ts::documentSample`; execution-packet/smoke callers and existing tests.
- Reuse the store's authoritative item/document/group location logic. Enumerate and deduplicate the canonical ticket, document, group-record and context paths under explicit count bounds before document/group content reads.
- Stat all authority files and enforce per-file plus aggregate bytes before opening content. Read sequentially through capped handles with pre/handle/post identity, regular-file, link, size and growth checks. Compute parsed item/group values, content versions and the document-inclusive revision from those same bounded bytes.
- Both whole-ticket and constrained packet paths consume this one snapshot. Scratch/reference remain revision-exempt, but their inventory and returned version bytes remain bounded; the existing 300-small-exempt-document case stays valid.
- Negative cases: counted limit and limit+1 with zero later content reads; real oversized document/group/context; aggregate small-file overflow; identity replacement/growth; handle closure; oversized whole-ticket and constrained issuance refuse before Git observation.

### Second-remediation acceptance and stop

- F-010 large-alphabet and shared-budget proofs terminate deterministically without losing exact ordinary semantics.
- F-011 makes symbol authority fail closed: non-empty symbols plus actual changes cannot PASS without a future versioned parser/range contract, while path failures retain FAIL precedence.
- F-012 proves real pre-allocation refusal and derives revision/evidence versions only from bounded exact bytes in both packet paths.
- Update canonical prose and its existing assertions, regenerate the MCP bundle, run the complete focused matrix, and stop on one clean commit in the existing branch/PR. The controller will then require fresh automated settlement, one final independent delta review, one fresh clean Windows rail, hosted `verify`, synced-board `kanmer-gate`, merge and exact-merge verification.


## Third exact-head root-cause remediation — review head `7d899869523ac5b55ef2debbf67d0324ebe4fb78`

The exact-head Windows and hosted verification rails passed, but the expected automated reviewer and a fresh independent exact-head reviewer confirmed F-014 through F-016 as merge-blocking authority gaps. They share one invariant: a packet may authorize the next worker action only when its checklist bytes, board bytes and complete tracked-workspace identity describe the same confined state. F-001 through F-012 remain fixed. F-013 remains rejected-with-reason in the exact-head attestation. This section is one consolidated root-cause correction; it adds no tool, writer, stage, dependency, schema or persisted state.

### RC-8 — Enforce one checklist frontier from exact content (F-014)

- Files/symbols: `packages/core/src/step-packet.ts::compileStepPacket`, `verifyStepPacket`, `checklistBoxes`, `boxesByStep`, `checklistStepLines`, `checklistLineMap`; `packages/core/src/step-packet.test.ts`; existing execution-packet/smoke callers only when an integration assertion is needed.
- Keep the generic next-step selector reusable, but make constrained packet compilation and strict verification reject any checked marker mapped to a step after the selected step. Earlier mapped steps must be complete and the selected step must contain unchecked work.
- During verification, derive marker states from the exact checklist content and validated step-line mapping, then compare those derived states with the packet's stored checklist states before trusting either. Recomputing a digest over contradictory stored state must not make it authoritative.
- Preserve multi-marker steps: the selected step may contain partial progress at issuance only when at least one of its own markers is unchecked; no successor marker may be checked.
- Negative cases: named and positional selection of step 1 from `[false, true]`; a partially prechecked later step; a re-digested forged packet; content checked while stored state says false; normal contiguous progress still compiles and strict-verifies.
- Focused command: `npm exec --workspace @kanmer/core -- vitest run src/step-packet.test.ts --no-file-parallelism`.
- Done when no sequence can become complete without every successor having first received and reconciled its own exact packet.

### RC-9 — Preserve byte-identical UTF-8 BOM authority (F-015)

- Files/symbols: `packages/core/src/store.ts::readAuthorityText` and bounded snapshot version/revision calculation; `packages/core/src/store.test.ts`; the checklist parsers named in RC-8 and their tests.
- Decode bounded UTF-8 with fatal invalid-byte handling while preserving an initial BOM (for Node's `TextDecoder`, use the option whose semantics retain the BOM). The bounded ticket/document/group strings, content versions and document-inclusive revision must equal the canonical store readers for the same bytes.
- Make checklist parsing tolerate exactly one leading U+FEFF on the first line without deleting or normalizing it from the content hashed into packet identity. The authorised marker transition must require the same BOM prefix before and after.
- Negative cases: BOM-prefixed ticket, checklist, research and group-context evidence; normal-versus-bounded version/revision equality; exact returned tokens succeeding in `updateItem`/`setDoc` CAS; invalid UTF-8 still refusing; BOM addition/removal during reconciliation refusing; ordinary BOM-free evidence unchanged.
- Focused commands: `npm exec --workspace @kanmer/core -- vitest run src/store.test.ts src/step-packet.test.ts --no-file-parallelism`, then `npm run build:core`.
- Done when one byte sequence has one authority identity across normal reads, bounded snapshots, packet compilation, verification and CAS.

### RC-10 — Census tracked modes and prove link confinement (F-016)

- Files/symbols: `packages/mcp-server/src/step-reconciliation.ts::parseIndexFlagCensus`, `captureOnce`, `collectWorkspaceSnapshot` and focused bounded helpers; `packages/mcp-server/src/step-reconciliation.test.mjs`; issuance/reconciliation integration tests and canonical prose only where the observable contract changes.
- Replace the flag-only census with one bounded NUL-delimited `git ls-files -v -s -z --full-name --` census. Parse and retain flag, mode, object id, stage and raw repository-relative path; keep the existing assume-unchanged/skip-worktree refusal and charge raw bytes, total entries and tracked-link entries before further work.
- Include the canonical index mode/object census in both workspace samples so mode, OID or representation drift cannot pass. Reject non-stage-zero entries and Git mode `160000` gitlinks as unprovable worker-file authority.
- For Git mode `120000`, inspect the actual representation with capped `lstat`, `readlink` and physical resolution. A traversable link is accepted only when its resolved target is provably the physical worktree root or a descendant; escaping, chained escape, dangling, unreadable, unstable or budget-exhausted targets are INCONCLUSIVE/refused before issuance or PASS. Include link bytes, representation, object id and resolved physical identity in the double-sample digest.
- A Git-for-Windows checkout that represents a mode-`120000` entry as an ordinary non-traversable placeholder remains bounded by its mode/OID/representation facts; any placeholder edit must still surface through ordinary Git status. Do not follow it as a link.
- Do not ban a clean internal symlink merely for existing: it may remain supported only when physical confinement is proved and a write through it is surfaced by the in-worktree target/status evidence. If that cannot be proved with the existing bounded collector, fail closed and record the exact fixture.
- Negative cases: clean absolute, parent-relative and chained external links; clean confined link and write-through; dangling/unreadable link; link or index-mode/OID drift between samples; malformed, oversized and too-many-entry census; mode-`160000`; ordinary tracked, staged and untracked files remain accepted; no index mutation.
- Focused commands: `npm run build:server`, `node --test packages/mcp-server/src/step-reconciliation.test.mjs`, `node --test packages/mcp-server/src/reconciliation.test.mjs`, `node packages/mcp-server/src/smoke.mjs`, `npm run smoke:protocol`.
- Done when every clean tracked path is either ordinary bounded Git authority or a physically confined, identity-bound link; no invisible write can escape the repository.

### Third-remediation acceptance and stop

- Update only already-authorised canonical prose/tests if the externally stated confinement/frontier contract needs clarification, then regenerate `plugins/kanmer/mcp/kanmer-mcp.cjs`; never hand-edit the bundle or weaken an assertion.
- Run the core focused matrix, collector, reconciliation, MCP smoke, protocol, scripts/prose/AGENTS, claims/batch regression, builds, typecheck, plugin byte check and `git diff --check`. Do not run a duplicate full Windows rail inside implementation; the release controller owns one fresh rail after the new source head is published.
- Commit one coherent root-cause remediation on the existing branch and PR. Update the post-implementation report and checklist, record the commit, and stop in Review without pushing, reviewing, merging, verifying or starting CORE-133.
- The controller will publish the source head, require exact-head automated settlement, one independent delta review over F-001 through F-016 plus changed callers/tests, a fresh clean Windows `npm run verify`, hosted `verify`, synced-board `kanmer-gate`, merge and exact-merge verification.


## Authoritative-rail correction discovered during CORE-119 preflight

Read-only preflight at exact source head `7d899869523ac5b55ef2debbf67d0324ebe4fb78` confirmed that the new collector suite `packages/mcp-server/src/step-reconciliation.test.mjs` is not named by the explicit `test:http` script in `packages/mcp-server/package.json`. Direct focused runs proved it, but root `npm run verify` and hosted `verify` reach MCP integration tests through that explicit list, so the clean and hosted passes at 7d899 did not exercise the collector. That is an unmet CORE-127 acceptance criterion, not new product scope.

### RC-11 — Put the existing collector suite on the existing verify rail

- File/symbol: `packages/mcp-server/package.json` existing `scripts.test:http` entry only.
- Add `src/step-reconciliation.test.mjs` to the existing explicit Node test command, preserving every current test, script name, workspace contract and package metadata. Do not add a script, runner, dependency or workflow.
- Keep the direct collector command for focused diagnosis. Also run `npm run test:http -w @kanmer/mcp-server` and confirm its output includes the collector negatives alongside the existing MCP integration suites.
- If any checked-in expectation counts the MCP test total, report its exact path before editing unless that path is already authorized by `files/files.md`; do not weaken or delete a count.
- The controller's next clean Windows `npm run verify` and hosted `verify` at the final published head must both prove this registration. Historical rails at 7d899 remain honest but incomplete for the collector.
- Done when the exact F-016 external-link, malformed/oversized census and ordinary-file regressions execute through the same existing command used by local and hosted authoritative verification.

## Fourth exact-head root-cause remediation — review head `437c7182021137eae962228942b712b2045cdc57`

The exact head passed the clean local Windows rail, but hosted verification exposed two unphysical direct-reader fixtures and the settled exact-head review plus independent disposable audits proved F-017 through F-020. These findings share the remaining invariant: every value and filesystem record that can authorize a worker step must have a type-distinct, pre-read-bounded, physically confined identity before dispatch. F-001 through F-016 remain fixed except F-013, which remains rejected-with-reason. This is the one root-cause replan authorized after the prior remediation budget; it adds no tool, schema, stage, writer, dependency or unrelated feature.

### RC-12 — Type-distinct ticket authority (F-017)

- Files/symbols: `packages/core/src/step-packet.ts::checkStepPacketBudget`, `canonicalJson`, `stepTicketAuthority`; `packages/core/src/step-packet.test.ts`; existing reconciliation integration only for the end-to-end stale-authority assertion.
- Preserve normal JSON-shaped authority hashes. Encode a valid `Date` with a deterministic type tag plus `toISOString()` so it cannot collide with either another Date or the same quoted string. Reject invalid Dates, non-finite numbers, cyclic structures and object prototypes other than ordinary/null-prototype objects; Buffer/typed arrays, Map, Set, RegExp and custom instances fail closed.
- Keep the existing volatile lease-heartbeat projection unchanged. Do not change global frontmatter parsing or rewrite board data.
- Negative cases: different/equal Dates, Date-versus-string, nested Date, invalid Date, NaN/infinities, Buffer, Map, Set, RegExp, custom/null prototype and cycle. Changing an unknown YAML timestamp plus only the selected checklist marker must FAIL with `STEP_TICKET_AUTHORITY_STALE` and revision staleness; unchanged metadata plus that marker transition still PASSes.

### RC-13 — Prove every tracked write alias before dispatch (F-018/F-020)

- Files/symbols: `packages/mcp-server/src/step-reconciliation.ts::trackedLinkIdentity`, `captureOnce` and focused helpers; `packages/mcp-server/src/step-reconciliation.test.mjs`; canonical prose only if its already-stated confinement wording needs precision.
- Retain only the currently supported direct confined tracked link: decode its link bytes, lexically resolve the target relative to the tracked link, require that path inside the physical worktree, reject every symlink/junction component between the physical root and final target, require a single-link regular final file, perform the existing bounded handle read, then repeat and compare the complete path/target validation. Any chained link—including an out-and-back chain—refuses.
- During both `captureOnce` samples, metadata-check every mode-`100644`/`100755` path from the already bounded index census before dispatch. Materialized paths must be physically confined single-link regular files; missing/deleted paths must agree with the porcelain census. Retain a bounded stable-facts digest in the internal double-sample so replacement/link-count drift is not discarded. Do not read/hash all clean file contents or change the packet schema.
- Negative cases: external intermediate returning inside, internal component redirecting outside, direct confined one-hop link control, clean two-link regular file with empty status, hardlink added between samples, missing/deleted path mismatch, and all existing dirty-hardlink/external/dangling/placeholder/ordinary controls.

### RC-14 — Fold bounded batch state into execution authority (F-019)

- Files/symbols: `packages/core/src/store.ts::ExecutionAuthoritySnapshot`, execution-authority limit/helpers and `getExecutionAuthoritySnapshot`; `packages/core/src/store.test.ts`; `packages/mcp-server/src/step-reconciliation.ts::documentSample` and its existing tests.
- Add `batch` to the core metadata-first snapshot and consume `authority.batch` directly. Remove the later uncapped `batchStateFromExecutionAuthority` hop from constrained document sampling. Ordinary batch mutation, closeout, merge-gate and listing paths remain unchanged.
- The execution-only manifest census streams the transaction directory and counts every entry, including ignored temp entries. Preflight before opening: at most 256 directory entries/manifests, 64 KiB per manifest, 512 KiB aggregate manifest bytes, 256 members per manifest and 2,048 aggregate member references.
- Preserve complete warning-aware ticket census semantics for extra stamped members and malformed endpoints, but make it metadata-first: at most 2,048 ticket endpoints, 64 KiB per record and 8 MiB aggregate ticket bytes. Preflight the complete census before reads, use the existing identity-checked fatal-UTF-8 handle reader, reuse the already authoritative selected item and reuse each bounded census record rather than rereading manifest members.
- Bind manifest and ticket directory/file identities so symlink, junction, hard-link, replacement, growth and double-sample drift refuse. Normal isolated and active-batch behavior remains unchanged.
- Negative cases: 64 KiB+1 isolated manifest with zero content read, 257 entries including ignored temps, >512 KiB aggregate manifests, 257 members, >64 KiB ticket, >8 MiB census, member read replacement/growth/close, manifest/member link escapes, valid active batch, extra stamped member, malformed unrelated ticket and drift across samples.

### RC-15 — Make hosted direct-reader fixtures physical (F-021)

- File/symbol: the two direct `readBoundedWorkspaceFile` tests in `packages/mcp-server/src/step-reconciliation.test.mjs`.
- Retain each raw `fs.mkdtemp` path only for cleanup; pass `await fs.realpath(allocatedRoot)` as the reader root and derive fixture paths from it. Preserve every race hook and assertion. Do not broaden accepted errors or alter production code for this runner spelling.
- Re-run the bounded-handle name pattern and complete collector suite before the authoritative MCP test command.

### Fourth-remediation acceptance and stop

- Add failed-first tests for RC-12 through RC-15, then implement the shared invariants in the already-authorized files.
- Run core step-packet/store plus claims/batch regressions; collector and reconciliation suites; `npm run test:http -w @kanmer/mcp-server`; MCP/protocol smoke; scripts/prose/AGENTS checks; builds/typecheck; plugin build/check and `git diff --check`.
- Do not run a duplicate full Windows rail inside implementation. Regenerate the committed bundle, commit one coherent correction, update the checklist/report/ticket commit, and return the same PR to Review without pushing, self-reviewing, merging, verifying or starting CORE-133.
- The release controller then publishes the head and requires a fresh clean Windows rail, hosted `verify`, settled automated exact-head review, one fresh independent delta review over F-001 through F-021 and all affected callers/tests, synced-board `kanmer-gate`, merge and exact-merge verification.

## Fifth exact-head delta remediation — F-022 / F-023

Exact-head automated and independent review of `c549e1febacbf210d74dc45cd04b647c4dd7be42` found two remaining violations of the existing Step 3/RC-13 bounded-workspace invariant. They stay inside the already-authorised collector source, collector tests, and generated bundle.

### RC-16 — Bind the aggregate deadline to filesystem traversal (F-022)

- Files/symbols: `packages/mcp-server/src/step-reconciliation.ts::collectWorkspaceSnapshot`, `captureOnce`, `trackedRegularMetadataCensus`, `confinedPathProof`, and their existing sequential workspace helpers; `packages/mcp-server/src/step-reconciliation.test.mjs`.
- Carry one absolute deadline through both samples and every sequential workspace filesystem traversal. Check it before starting I/O and bound the awaited operation; an expired or stalled non-Git census returns INCONCLUSIVE with the same aggregate deadline reason.
- Preserve the 30-second production maximum and the existing test-only tightening rule. Add no scheduler, worker, dependency, cache, or caller-supplied extension.
- Negative proof: a deterministic test advances the internal test clock during the regular-file census and proves refusal occurs there, not only after both samples.

### RC-17 — Prove raw tracked-link components in kernel order (F-023)

- Files/symbols: `packages/mcp-server/src/step-reconciliation.ts::trackedLinkIdentity` and a focused raw-target helper; `packages/mcp-server/src/step-reconciliation.test.mjs`.
- Resolve each raw target component in order from the already-proved link parent. Reject every symlink/junction intermediate before processing a following `..`; allow parent traversal only after a real directory was proved and only while the cursor remains at or below the physical worktree root. Require a final direct single-link regular file and bind the repeated proof.
- Retain safe direct confined links, including a confined parent-relative target. Reject absolute spellings that do not directly share the physical-root prefix and every erased-hop/out-and-back spelling.
- Negative proof: an ignored `ignored-hop` link plus tracked raw target `ignored-hop/../victim` must refuse on all checkout representations; a normal-directory `dir/../victim` and a confined `../shared/file` control remain valid where represented as real tracked links.

### Commands and stop

Run the collector suite failed-first and after correction, then the authoritative MCP `test:http`, server build/typecheck, plugin rebuild/identity check, and `git diff --check`. Update the report/checklist, commit one coherent F-022/F-023 correction, and return the same PR to Review. The release controller owns the clean full Windows rail, hosted checks, automated settlement, independent delta review, public thread dispositions, merge, and exact-merge verification.

## Sixth exact-head root-cause remediation — F-024 through F-028

Exact-head automated and independent review of `a682057152c24fb30c84ff6b296cd97e7a5ee439` confirmed F-022/F-023 and every prior blocker/major disposition, then found five remaining violations of the existing byte-exact, observable-authority and truthful-reconciliation contracts. They are one bounded remediation in the already-authorised packet, collector, reconciliation, canonical prose/test and generated-bundle files. No tool, stage, schema, dependency or persisted state is added.

### RC-18 — Bind tracked links to exact bytes and observable tracked targets (F-024 / F-025)

- Files/symbols: `packages/mcp-server/src/step-reconciliation.ts::UTF8_FATAL`, `trackedLinkTargetProof`, `trackedLinkIdentity`, `trackedRegularMetadataCensus`; `packages/mcp-server/src/step-reconciliation.test.mjs`.
- Preserve a leading UTF-8 BOM in every decoded Git/filesystem path byte sequence by configuring the fatal decoder with `ignoreBOM: true`. The validator and kernel must use the same target spelling.
- Build the canonical set of indexed stage-0 mode-100644/100755 regular paths from the already-bounded index census. A mode-120000 target is admissible only when its final proved confined target is one of those indexed tracked regular paths. Ignored, untracked, unsupported, chained or otherwise unobservable targets refuse before packet issuance; do not add `--ignored` scanning or a parallel authority source.
- Retain the existing repeated identity/link/hard-link/confinement checks for the final target. Attribute later mutations through the ordinary tracked target's porcelain/index evidence rather than granting authority from the link digest alone.
- Negative cases: real symlink and Windows placeholder targets beginning with BOM select no non-BOM sibling; an allowed link to an ignored/forbidden target refuses; a direct link to an indexed tracked regular file remains valid and a later target mutation is classified under the tracked target path.

### RC-19 — Preserve workspace evidence under drift and unknown authority (F-026 / F-027)

- Files/symbols: `packages/mcp-server/src/reconciliation.ts::reconcileTicket`, the pre-Git authority shortcut and unavailable-snapshot branch; `packages/mcp-server/src/reconciliation.test.mjs`.
- Short-circuit before Git only for facts that make the supplied packet foreign or forged: `STEP_IDENTITY_MISMATCH`, or `STEP_PLAN_AUTHORITY_MISMATCH` when there is no `STEP_PLAN_STALE` evidence showing ordinary post-issuance drift. Plan, ticket, research, files, checklist and group-context drift must still collect the bounded workspace snapshot and report forbidden/undeclared changes in the same result.
- If stable document authority cannot be collected, return an explicit `STEP_AUTHORITY_UNAVAILABLE` INCONCLUSIVE result with the bounded reader's reason. Do not fabricate `batch: null`, run identity classification against invented facts or erase the retained packet's batch identity.
- Preserve the existing recomputed-broader/forged-plan refusal before Git. Negative cases combine plan, evidence and ticket drift separately with an undeclared file, plus a valid batched packet whose oversized/unreadable authority remains INCONCLUSIVE without `STEP_IDENTITY_MISMATCH`.

### RC-20 — Support every full Git object ID emitted by supported repositories (F-028)

- Files/symbols: `packages/core/src/step-packet.ts` compile and strict workspace-head validation; `packages/core/src/step-packet.test.ts`; `packages/mcp-server/src/step-reconciliation.ts` HEAD validation; `packages/mcp-server/src/step-reconciliation.test.mjs`.
- Accept exactly 40-hex SHA-1 or 64-hex SHA-256 full object IDs wherever the packet workspace HEAD is compiled, verified or collected. Keep abbreviated, mixed-length and nonhex IDs refused.
- Reuse one local full-object-ID contract per package rather than guessing repository format from caller data. Do not change packet identity, index object validation or delivery-policy integration SHA semantics.
- Negative proof: core compilation/verification accept 40 and 64 only; a real `git init --object-format=sha256` fixture issues and collects a 64-character HEAD.

### Canonical contract, commands and stop

- Update `AGENTS.md`, `plugins/kanmer/skills/kanmer-execute/SKILL.md`, `plugins/kanmer/skills/kanmer-auto/SKILL.md` and `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` together: retained targets are indexed tracked regular files, path bytes preserve a leading BOM, and a packet HEAD is a full 40- or 64-hex Git object ID.
- Extend `scripts/verify-skill-prose.mjs` and its mutation tests without weakening existing assertions. Regenerate `plugins/kanmer/mcp/kanmer-mcp.cjs` mechanically.
- Run failed-first focused cases, then:
  - `npm exec --workspace @kanmer/core -- vitest run src/step-packet.test.ts --no-file-parallelism`
  - `node --test packages/mcp-server/src/step-reconciliation.test.mjs`
  - `node --test packages/mcp-server/src/reconciliation.test.mjs`
  - `npm run test:http -w @kanmer/mcp-server`
  - `npm run build:core`, `npm run build:server`, `npm run typecheck`
  - `npm run test:scripts`, `npm run verify:skills`, `npm run verify:agents-block`
  - `npm run plugin:build`, `npm run plugin:check`, `git diff --check`
- Update the report and checklist, commit and push one coherent correction, and return the same PR to Review. The release controller then owns one fresh clean Windows `npm run verify` rail at the new head, hosted exact-head settlement, one fresh independent delta review, public dispositions and thread resolution, synced-board gate, merge and exact-merge verification.


## Seventh exact-head root-cause remediation — complete changed-path and authority identity proof (F-029–F-031)

The exact-head automated review at `4a50a885cada3ce89119410d1d2b16e0677edda9` found three in-scope safety gaps. They are one final root-cause batch: complete the changed-path census and refuse authority that Git or board storage can make ambiguous. The existing PR, ticket, branch and worktree are retained; no new tool, stage, dependency, workflow engine or persisted server state is introduced.

### RC-21 — Classify every path touched by committed history, not only endpoint differences (F-029)

- Files/symbols: `packages/mcp-server/src/step-reconciliation.ts` history parser and `collectWorkspaceSnapshot`; `packages/mcp-server/src/step-reconciliation.test.mjs`.
- Require the packet HEAD to be an ancestor of the live HEAD. Bound the intervening commit census before reading path history, then collect one NUL-delimited, rename-disabled union of names from every intervening commit, including each merge-parent delta. Preserve Unicode/newline paths and charge duplicate commit touches before canonical de-duplication.
- Combine that complete history union with live index/worktree entries. A forbidden or undeclared path remains reported even when a later commit restores the endpoint bytes. Missing ancestry, malformed output, too many commits/paths, deadline exhaustion or unreadable history is INCONCLUSIVE, never PASS.
- Preserve current endpoint filesystem/link validation and the full 40/64-hex object-id contract. Do not persist commit history or add a Git service.

### RC-22 — Close status-hidden regular-file mode drift without making legitimate content edits fail (F-030)

- Files/symbols: `packages/mcp-server/src/step-reconciliation.ts::trackedRegularMetadataCensus`; its real Git fixtures; canonical constrained-step prose.
- For filesystems that expose executable bits, require every clean tracked regular path's physical executable class to agree with its indexed 100644/100755 mode in each bounded sample. A mismatch hidden by `core.fileMode=false` refuses collection before reconciliation can PASS.
- Continue to classify ordinary content, add/delete/rename and committed mode changes through porcelain plus the complete history union. Do not compare the existing aggregate inode/object/size digest across packet lifetime, because legitimate authorised writes and atomic-save implementations change those facts; both samples still bind identity, confinement, type, link count and size internally.
- Negative proof sets `core.fileMode=false`, changes only the executable bit, proves Git porcelain is empty, and requires fail-closed collection on a filesystem that represents that bit. Windows, where Node reports no executable-bit distinction, retains its existing bounded type/link/confinement proof.

### RC-23 — Refuse duplicate selected ticket endpoints before opening authority (F-031)

- Files/symbols: `packages/core/src/store.ts::locateExecutionAuthorityItem`; `packages/core/src/store.test.ts`.
- Complete the already-bounded target lookup across every area endpoint and legacy item type before selecting one location. Zero matches remains not-found; exactly one continues; two or more matching endpoints refuse as ambiguous before either ticket body is opened or signed.
- Preserve the existing 2,048 structural-entry bound, path validation, later identity-bound capped read, complete batch census and ordinary CRUD lookup behavior. Do not broaden this authority-only correction into a board migration or silently choose lexical first.
- Negative proof creates the same selected id under two area endpoints and asserts refusal before any candidate content open; a unique isolated v2 endpoint and the existing legacy-v1 control remain valid.

### Canonical contract, commands and stop

- Update `AGENTS.md`, `plugins/kanmer/skills/kanmer-execute/SKILL.md`, `plugins/kanmer/skills/kanmer-auto/SKILL.md` and `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` together: changed-path evidence is the bounded complete intervening commit union plus live status, clean physical executable mode must agree with indexed mode where representable, and execution authority requires one unique selected ticket endpoint.
- Extend `scripts/verify-skill-prose.mjs` and mutation tests without weakening existing assertions. Regenerate `plugins/kanmer/mcp/kanmer-mcp.cjs` mechanically.
- Run failed-first focused regressions, then the core step-packet/store matrix, complete collector, reconciliation suite, authoritative MCP `test:http`, smoke/protocol, script/prose/AGENTS checks, all-workspace typecheck, core/server builds, plugin build/check and `git diff --check`.
- Update the report and checklist, commit/push one coherent correction, and return the same PR to Review. Then wait for hosted exact-head verification and automated review, obtain one fresh independent exact-head delta review, publicly disposition every thread, sync the board, pass `kanmer-gate`, merge and verify the exact merge SHA.
