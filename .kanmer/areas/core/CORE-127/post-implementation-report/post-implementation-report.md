# Post-implementation report — CORE-127

## Outcome

Implemented constrained-step reconciliation on exact base `4fda54b4489fa4bc4b6b091c2af67715245ffa08` without adding a tool, stage, write surface, dependency, database, or persisted packet store.

- Strictly parses declared and Git-observed repository-relative paths.
- Supports literal paths, segment-local `*`, and whole-segment `**`.
- Proves authority containment and forbidden overlap with bounded exact automata; proof-budget exhaustion is explicit and fails closed.
- Uses bounded iterative tri-state path membership and linear segment matching; matcher exhaustion becomes INCONCLUSIVE and can never authorize a path.
- Versions the packet contract as `step-packet/2`, including exact checklist, document, branch, HEAD, and workspace-baseline evidence.
- Refuses constrained issuance unless the selected step maps to at least one unchecked checklist marker.
- Derives every packet checklist state from the exact content, requires a completed prefix and unfinished selected step, and refuses any prechecked successor marker.
- Preserves a leading UTF-8 BOM in bounded ticket/document/group authority, packet identity and CAS versions while retaining fatal invalid-UTF-8 refusal.
- Compares exact checklist line bodies and terminators, allowing only the mapped `[ ]` to `[x]` or `[X]` transition.
- Compares actual Git changes with the exact retained packet, including rename endpoints and paths already dirty at issuance.
- Canonicalizes repeated group membership, rejects conflicting duplicate evidence, and verifies each emitted packet before returning it.
- Refuses exact and descendant paths under a dedicated board worktree while preserving the legacy colocated source/board layout.
- Extends the existing read-only `reconcile_ticket` result while preserving the ordinary recommendation.
- Refuses another constrained packet unless the complete exact prior packet reconciles PASS.
- Updates AGENTS.md, canonical skills/tool reference, prose guards, tests, and the committed standalone MCP bundle.
- Bounds one lexical de-duplicated group census before any group/context I/O in both packet paths.
- Charges raw parsing plus literal and wildcard comparisons to one aggregate matcher budget; exhaustion is INCONCLUSIVE.
- Reads dirty file evidence through one capped identity-checked handle and rejects replacement, shrink, growth and post-read drift.
- Hashes a bounded `git ls-files -v -s -z` census in both samples, binding flag, mode, object id, stage and path; hidden flags, nonzero stages, gitlinks and census drift refuse without index mutation.
- Retains a clean tracked mode-`120000` path only when its representation, target bytes and physical regular-file confinement are provable; external, chained-external, dangling, unstable and over-budget links fail closed.
- Registers the existing collector suite in `packages/mcp-server`'s existing `test:http` command so local and hosted authoritative verification invoke it.
- Shares one aggregate compile-time glob proof budget across alphabet construction, NFA closure/transitions, caches and queues; exhaustion remains blocking `PLAN_GLOB_COMPLEXITY`.
- Makes actual changes under non-empty free-form symbol authority `STEP_SYMBOL_SCOPE_INCONCLUSIVE`, while forbidden/undeclared path FAIL retains precedence and empty-symbol file scope can PASS.
- Derives whole-ticket and constrained packets from one metadata-first core snapshot with bounded ticket/document/group counts and bytes, identity-bound handles, and revision versions from the exact bytes read.
- Anchors snapshot confinement at the physical configured project root: a project-root junction remains valid, while internal `.kanmer`, ticket, document and group junctions refuse before external bytes can become authority.

## Commits

- `5a8c5faef89a70b2f4c8b350e1f9314cc6fa62c6` — Enforce constrained step reconciliation.
- `fbeab7630d6d287c90f1d59da596890ae507b0be` — Prove glob authority with exact containment.
- `fc242c3c8fc8c97d2fbb7c9948af3f7d537c4de7` — Harden constrained step packet reconciliation.
- `5302e445dc70714e89762dc19fb96754490e3fa9` — Harden constrained execution evidence.
- `7d899869523ac5b55ef2debbf67d0324ebe4fb78` — Bind bounded execution authority.
- `437c7182021137eae962228942b712b2045cdc57` — Close constrained authority gaps.
- `c549e1febacbf210d74dc45cd04b647c4dd7be42` — Close final execution-authority races and bounds.

Pull request: #307.

## Verification

The clean Windows `npm run verify` rail passed at exact prior head `fc242c3c8fc8c97d2fbb7c9948af3f7d537c4de7` from 2026-08-31T20:58:44.5293965Z through 2026-08-31T21:10:01.7598092Z on Windows, Node v24.15.0 and npm 11.14.1. Hosted `verify` also passed there in Actions run 33438698598. Because source changed afterward, both are historical evidence only.

Prior focused remediation evidence at exact head `5302e445dc70714e89762dc19fb96754490e3fa9`, all exit 0:

- Core plan + packet: 108/108 PASS.
- Workspace/document collector: 27/27 PASS.
- Reconciliation: 37/37 PASS.
- MCP smoke: 380/380 PASS.
- Protocol: 50/50 PASS.
- Script tests: 161/161 PASS.
- AGENTS block: 31/31 PASS.
- Core/MCP builds, all-workspace typecheck and canonical skill verification: PASS.
- Plugin build/check: 41-tool roster, byte identity and isolated handshake PASS.
- `git diff --check`: PASS; worktree clean.

Failed-first evidence is retained for the new remediation: literal-budget tests first failed twice; the group/index collector first accepted two unsafe cases; one parser-message expectation and one unused-import typecheck failure were corrected; and the first final scripts run was 160/161 because a prose fixture anchor crossed a wrapped line. The implicated suites were rerun and passed completely. Earlier failed-first evidence for F-001 through F-005 remains recorded at its original commits.

A fresh clean Windows `npm run verify`, hosted `verify`, exact-head automated review settlement, independent delta review and board-synced `kanmer-gate` are controller work and remain pending at the new remediation head recorded below.

## Review disposition

F-001 through F-005 remain fixed in `fc242c3c8fc8c97d2fbb7c9948af3f7d537c4de7`. The four exact-head majors from the next review are addressed together in `5302e445dc70714e89762dc19fb96754490e3fa9`:

- F-006: one pre-I/O counted-document plus unique-group bound is shared by whole-ticket and constrained paths.
- F-007: literal parsing/equality and wildcard work consume the same aggregate budget before work.
- F-008: path and handle identity/size/type/mode/link facts bracket a capped handle read.
- F-009: a bounded non-mutating index-flag census refuses hidden tracked authority and detects drift.

All current GitHub threads remain open until the final exact-head automated and independent delta reviews settle. Their durable public dispositions and resolution are controller work; no finding is silently closed.

An earlier major containment issue was fixed in `fbeab7630d6d287c90f1d59da596890ae507b0be` by replacing constructive subset proof with exact bounded whole-path language containment/intersection. Its independent symbolic oracle covered 17,295 containment relations without mismatch.

A resource bound remains intentional: automaton proof exhaustion produces `PLAN_GLOB_COMPLEXITY` and refuses authority. Runtime path-membership exhaustion is separately surfaced as INCONCLUSIVE. Neither can silently authorize a path.

## Second exact-head remediation

Commit `7d899869523ac5b55ef2debbf67d0324ebe4fb78` addresses F-010 through F-012 together:

- F-010: one aggregate compile-time proof context charges alphabet, NFA, closure, transition, cache and queue work before growth; exact equality stays bounded and proof exhaustion is explicit.
- F-011: free-form symbol names cannot authorize changed ranges without a versioned language/parser contract, so actual changes with non-empty symbols are typed INCONCLUSIVE; path FAIL precedence and empty-symbol PASS remain intact.
- F-012: `KanmerStore.getExecutionAuthoritySnapshot` performs a canonical metadata census, preflights count and byte bounds, reads through identity-bound capped handles, derives gate/revision/evidence facts from those bytes, and serves both packet routes. Physical project-root anchoring rejects internal directory junction escapes.
- F-013 remains rejected-with-reason: retained shared evidence binds `<group-id>/context.md`; the complete parsed group object remains issuance-coherence metadata and no new persisted authority field is needed.

Focused evidence at exact commit `7d899869523ac5b55ef2debbf67d0324ebe4fb78`, all exit 0:

- Core plan, step-packet and store: 206/206 PASS.
- Core claims/batch regression: 84/84 PASS.
- Workspace collector: 24/24 PASS.
- Reconciliation: 37/37 PASS.
- MCP smoke: 381/381 PASS.
- Protocol smoke: 50/50 PASS.
- Script suites: 161/161 PASS; constrained prose mutation suite 53/53 PASS; AGENTS block 31/31 PASS.
- Core/MCP builds, all-workspace typecheck, canonical skill verification, plugin build/check (41 tools, byte identity, isolated handshake), and `git diff --check`: PASS.
- Real junction fixtures refuse document-root, ticket-root, group-root and `.kanmer` redirects, while a configured project-root junction remains valid.
- Independent precommit audit: no remaining blocker or major; its one reproduced F-012 junction escape was fixed and re-audited.

Failed-first evidence remains explicit: the initial F-010/F-011 focused run was 108/111 with the shared-budget, distinct-alphabet and symbol-scope cases failing; the precommit exploit probe accepted external research bytes through a junction before the confinement fix; the first post-signature core rerun exposed one omitted confinement argument (202/206), then passed 206/206 after correction. The first prose-mutation run exposed one stale wrapped-line fixture anchor (52/53), then passed fully.

The fresh clean Windows `npm run verify`, hosted `verify`, exact-head automated review settlement, independent final delta review and board-synced `kanmer-gate` remain controller work after this implementation handoff.

## Third exact-head remediation

Commit `437c7182021137eae962228942b712b2045cdc57` addresses F-014 through F-016 and the authoritative-rail correction together:

- F-014: constrained compilation and strict verification derive every marker state from exact checklist content and its validated line map, require a completed prefix plus unfinished selected step, and reject any checked successor marker, including partial successor progress and a re-digested contradictory stored summary.
- F-015: bounded authority decoding retains a leading UTF-8 BOM while remaining fatal for invalid UTF-8; ticket, research, checklist and group-context versions/revisions match normal readers and remain valid CAS tokens; checklist parsing tolerates only the leading BOM as syntax and marker transitions cannot add or remove it.
- F-016: one bounded `git ls-files -v -s -z --full-name --` census binds tag, mode, object id, stage and exact path in both samples. Unsupported modes, nonzero stages, gitlinks, hidden flags and census drift refuse. Clean mode-`120000` entries retain bounded representation/target identity only when a regular physical target is confined inside the worktree; external, chained-external, dangling, unstable and over-budget targets refuse.
- RC-11: `packages/mcp-server/package.json` now includes the existing collector suite in the existing `test:http` list, with all prior scripts, tests and metadata preserved.

Failed-first evidence was retained rather than overwritten:

- Before F-014/F-015 implementation, the focused packet/store run was 145 PASS / 7 FAIL: six packet frontier/BOM cases and one normal-versus-bounded revision divergence.
- Before F-016 implementation, the collector was 25 PASS / 3 FAIL: the old flag-only parser shape, a clean confined link absent from retained authority, and an external link incorrectly accepted.
- The first updated prose verification isolated two canonical contract matcher failures for the frontier and complete index/link census. The wording and line-wrap-tolerant semantic pins were corrected; the unchanged assertions were not weakened.

Final focused evidence on the source that produced commit `437c7182021137eae962228942b712b2045cdc57`, all exit 0:

- Core plan, step-packet and store: 214/214 PASS.
- Core claims/batch regression: 84/84 PASS.
- Workspace collector: 30/30 PASS.
- Reconciliation: 37/37 PASS.
- Existing authoritative MCP workspace command `npm run test:http -w @kanmer/mcp-server`: 212/212 PASS; its emitted command and results include all 30 collector cases.
- MCP smoke: 381/381 PASS; protocol smoke: 50/50 PASS; the tool roster remains 41.
- Script suites: 161/161 PASS; standalone prose mutation suite: 53/53 PASS; AGENTS block: 31/31 PASS; canonical skill verification: ALL CHECKS PASSED.
- Core/MCP builds, all-workspace typecheck, generated plugin build/check, bundle byte identity, isolated 41-tool handshake and `git diff --check`: PASS.
- The committed worktree is clean on branch `core-127-constrained-step-reconciliation`.

The implementation run intentionally did not run `npm run verify`. One fresh clean Windows rail after publication, hosted `verify`, exact-head automated settlement, independent delta review and board-synced `kanmer-gate` remain controller work. Historical rails at `7d899869523ac5b55ef2debbf67d0324ebe4fb78` remain honest but did not execute the collector through `test:http`.

No implementation blocker remains. The intentional residual boundary is fail-closed: tracked links whose target is a directory, external, chained-external, dangling, unreadable, unstable, hard-linked or over budget remain unprovable; Git-for-Windows regular placeholders are retained only through their bounded exact representation.

### Files changed in the third remediation

- `AGENTS.md`
- `packages/core/src/step-packet.ts`
- `packages/core/src/step-packet.test.ts`
- `packages/core/src/store.ts`
- `packages/core/src/store.test.ts`
- `packages/mcp-server/package.json`
- `packages/mcp-server/src/step-reconciliation.ts`
- `packages/mcp-server/src/step-reconciliation.test.mjs`
- `plugins/kanmer/mcp/kanmer-mcp.cjs`
- `plugins/kanmer/skills/kanmer-auto/SKILL.md`
- `plugins/kanmer/skills/kanmer-execute/SKILL.md`
- `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md`
- `scripts/verify-skill-prose.mjs`
- `scripts/verify-skill-prose.test.mjs`

## Fourth exact-head remediation

Commit `c549e1febacbf210d74dc45cd04b647c4dd7be42` addresses F-017 through F-021 as one execution-authority correction:

- F-017: ordinary JSON authority retains its pinned hash, while valid Dates receive a deterministic type-distinct ISO encoding. Invalid Dates, non-finite numbers, cycles, Buffer/typed arrays, Map/Set/RegExp and custom prototypes refuse; ordinary and null-prototype objects remain valid. A changed unknown YAML timestamp plus only the exact checklist tick now fails both ticket authority and revision staleness, while the unchanged control passes.
- F-018/F-020: a tracked link is admissible only as one direct lexically confined target whose complete component walk is non-link/non-junction and whose final target is a single-link regular file. Both workspace samples metadata-check every mode-100644/100755 index entry; missing entries must agree with same-sample deletion or rename-source porcelain evidence, and the retained stable-facts digest exposes replacement/link drift.
- F-019: `ExecutionAuthoritySnapshot.batch` now owns execution-only batch projection. Manifest enumeration counts every transaction entry and preflights 256 entries, 64 KiB per manifest, 512 KiB aggregate, 256 members and 2,048 references. Complete warning-aware ticket census preflights every structural entry and endpoint at 2,048 entries/endpoints, 64 KiB per record and 8 MiB aggregate, reuses the selected and retained records, and refuses link, replacement, growth and identity drift. The authority-only selected-ticket lookup is also bounded before any content open; ordinary CRUD and batch mutation/list/merge behavior is unchanged.
- F-021: exactly the two direct bounded-reader fixtures retain their allocated cleanup roots but derive reader roots and fixture paths from `fs.realpath`; their race hooks and assertions are unchanged.
- No canonical prose change was required because its existing contract already states the resulting type, confinement, index and metadata-first bounds. The committed standalone MCP bundle was regenerated and remains byte-identical to the build with 41 tools.

### Failed-first evidence

The failures were retained rather than replaced by the final passes:

- `npm exec --workspace @kanmer/core -- vitest run src/step-packet.test.ts --reporter=verbose` first reported 56 PASS / 2 FAIL: two different Date values hashed identically, and changing the unknown YAML timestamp beside the exact checklist tick returned PASS instead of `STEP_TICKET_AUTHORITY_STALE`.
- The initial collector run reported 30 PASS / 4 FAIL: an in-worktree tracked link chain was accepted, a clean multi-link regular file was accepted, a missing tracked path with dishonest porcelain was accepted, and the first same-byte replacement fixture exposed that its fixture used normalized LF instead of the repository's exact bytes. That fixture was corrected to reuse the exact original bytes before the final replacement result; no production assertion was weakened.
- The independent pre-remediation F-019 reproduction recorded in `scratch/review.md` showed a 2 MiB manifest and 2 MiB ticket records being read before packet limits. The retained final tests now prove per-record, aggregate, member/reference, structural-name and selected-lookup refusal before sibling content opens.
- The hosted F-021 failure at Actions run 33454522677 remains historical evidence: exactly two direct-reader tests failed before their intended race hooks when given the unphysical temporary-root spelling.

### Final focused evidence

All commands below exited 0 on the source committed as `c549e1febacbf210d74dc45cd04b647c4dd7be42`:

- F-017 packet focus: 58/58 PASS.
- Final core plan/packet/store matrix: 225/225 PASS. The complete core regression passed 813/813 before the final test-only legacy-v1 control was added; that control passed 1/1 and is included in the final 225-test matrix.
- F-018/F-020 collector focus: 9/9 PASS, including staged rename, nested-directory deletion, parent-link, chain, hard-link and missing-status cases.
- Authoritative `npm run test:http -w @kanmer/mcp-server`: 218/218 PASS, including the complete collector suite.
- MCP stdio smoke: 381/381 PASS. Protocol smoke: 50/50 PASS. Both list exactly 41 tools.
- `npm run test:scripts`: 161/161 PASS. `npm run verify:skills`: ALL CHECKS PASSED. `npm run verify:agents-block`: 31/31 PASS.
- All-workspace `npm run typecheck`: PASS. Core and MCP development/standalone builds: PASS.
- `npm run plugin:build` and `npm run plugin:check`: PASS; bundle bytes match and isolated MCP handshake lists 41 tools.
- `git diff --check` and the staged diff check: PASS. The worktree is clean and the branch is ahead only by the one coherent final remediation commit.

The implementation run intentionally did not run root `npm run verify`. The release controller owns the one fresh clean Windows rail after publication, hosted `verify`, exact-head automated settlement, independent delta review, synced-board `kanmer-gate`, merge and exact-merge verification.

### Files changed in the fourth remediation

- `packages/core/src/step-packet.ts`
- `packages/core/src/step-packet.test.ts`
- `packages/core/src/store.ts`
- `packages/core/src/store.test.ts`
- `packages/mcp-server/src/step-reconciliation.ts`
- `packages/mcp-server/src/step-reconciliation.test.mjs`
- `plugins/kanmer/mcp/kanmer-mcp.cjs`

No implementation blocker remains. The intentional residual boundary stays fail-closed: unsupported/chained links, ambiguous or drifting index/filesystem facts, and over-limit manifest/ticket authority refuse rather than PASS. Node does not provide an atomic openat-style ancestor walk on this Windows path; repeated component proofs, single-handle file reads, retained identities and the double sample make that bounded sampling boundary explicit without claiming impossible atomicity.

## Scope confirmation

All changed source, test, prose, and generated files are in the versioned files/plan packet. CORE-126 batch ownership, CORE-133 abandoned-workspace routing, CORE-129 proof consistency, GUI behavior, workflow stages, release records, provider configuration and unrelated local state were not absorbed.

## Exact-head F-022 / F-023 correction

Review of exact PR head `c549e1febacbf210d74dc45cd04b647c4dd7be42` produced one major and one blocker. The existing branch/worktree was returned through the audited Review → Implementing path; no new workspace, tool, stage, dependency, or ticket was introduced.

### Source changes

- `packages/mcp-server/src/step-reconciliation.ts`
  - carries one absolute aggregate deadline through Git and sequential workspace filesystem collection;
  - checks the deadline at each census/loop boundary and bounds resource-free filesystem observations;
  - preserves handle closure while refusing a read that crosses the deadline;
  - proves raw tracked-link target components in filesystem order, rejecting a link/junction hop before a later `..` can erase it;
  - retains direct confined and parent-relative targets only when every traversed directory and final single-link regular file is proved twice.
- `packages/mcp-server/src/step-reconciliation.test.mjs`
  - adds an ignored external-hop plus `ignored-hop/../victim.txt` refusal on real-link and Windows placeholder representations;
  - retains `normal/../victim.txt` and nested `../tracked.txt` confined controls;
  - adds a deterministic test clock that expires inside the regular-file census.
- `plugins/kanmer/mcp/kanmer-mcp.cjs`
  - regenerated mechanically from the final server source.

### Verification retained

- First complete collector run at the changed source: 36/38 PASS. The two failures were exact fixture/error-contract corrections: the Windows link fixture needed `core.symlinks=false` for a clean mode-120000 placeholder, and the new parent-traversal refusal needed the existing “outside the physical worktree” wording. No production acceptance was weakened.
- Focused rerun after those corrections: 2/2 PASS.
- Complete collector suite: 38/38 PASS.
- Authoritative MCP `test:http`: 220/220 PASS, including the collector.
- All-workspace `npm run typecheck`: PASS.
- Server development and standalone builds: PASS.
- `npm run plugin:build` and `npm run plugin:check`: PASS; 41 tools, exact bundle bytes, isolated handshake.
- `git diff --check`: PASS.

The clean full Windows rail, hosted verification, exact-head automated settlement, independent delta review, public dispositions, synced-board gate, merge, and exact-merge verification remain controller-owned after the coherent correction commit.


## Sixth exact-head root-cause remediation

Commit `4a50a885cada3ce89119410d1d2b16e0677edda9` addresses exact-head findings F-024 through F-028 together:

- F-024: tracked-link target decoding retains a leading UTF-8 BOM, so a BOM-prefixed path component cannot be normalized into a different target. Both native links and Git-for-Windows placeholder representations are covered.
- F-025: a retained tracked link may resolve only to an indexed mode-100644/100755 regular path from the same bounded census. Ignored and untracked targets refuse even when the link itself is clean.
- F-026: plan, evidence and ticket authority drift after issuance no longer suppresses actual workspace collection. Typed stale findings and forbidden/undeclared changed-path evidence are returned together before any successor packet.
- F-027: an unavailable bounded authority snapshot returns explicit `STEP_AUTHORITY_UNAVAILABLE` with the verified packet identity and no invented isolated batch authority. The regression uses a genuinely declared two-ticket batch.
- F-028: packet compilation, strict verification and real workspace collection accept only complete 40-character SHA-1 or 64-character SHA-256 Git object IDs.

Canonical AGENTS, execute/auto skills and tool reference prose now state the BOM, indexed-target and SHA-1/SHA-256 contract. Mutation tests pin each statement, and the standalone MCP bundle was regenerated mechanically.

### Failed-first evidence

The new tests were run before the production fixes and retained their exact failures:

- Core packet focus: 58 PASS / 1 FAIL because a valid 64-character SHA-256 HEAD was refused.
- Workspace collector: 38 PASS / 5 FAIL, comprising the SHA-256 repository, native-link and placeholder BOM cases, and ignored/untracked target authority.
- Reconciliation: 37 PASS / 4 FAIL, comprising three post-issuance drift cases that lost changed-path evidence and one unavailable-batch case that returned a false identity failure.

No assertion was weakened. An independent fixture audit then found that the first F-027 regression constructed a batch field on an isolated packet; the fixture was replaced with a real frozen two-ticket batch before final evidence was accepted.

### Final implementation evidence

All commands exited 0 on the exact source committed as `4a50a885cada3ce89119410d1d2b16e0677edda9`:

- Core step-packet focus: 59/59 PASS.
- Workspace collector: 43/43 PASS.
- Reconciliation: 41/41 PASS.
- Authoritative MCP workspace command `npm run test:http -w @kanmer/mcp-server`: 229/229 PASS.
- MCP stdio smoke: 381/381 PASS; protocol smoke: 50/50 PASS; tool roster remains exactly 41.
- Script suites: 161/161 PASS; canonical skill verification: ALL CHECKS PASSED; AGENTS block: 31/31 PASS.
- All-workspace typecheck, core/MCP builds, plugin build/check, exact bundle byte identity, isolated handshake, `git diff --check`, and staged diff check: PASS.
- The branch was pushed to PR #307 and the ticket worktree is clean.

The implementation run intentionally did not treat historical verification as final-head proof. One fresh clean Windows `npm run verify` at this exact head, hosted `verify`, exact-head automated settlement, fresh independent delta review, public thread dispositions, synced-board `kanmer-gate`, merge and exact-merge verification remain controller-owned.

### Files changed in the sixth remediation

- `AGENTS.md`
- `packages/core/src/step-packet.ts`
- `packages/core/src/step-packet.test.ts`
- `packages/mcp-server/src/reconciliation.ts`
- `packages/mcp-server/src/reconciliation.test.mjs`
- `packages/mcp-server/src/step-reconciliation.ts`
- `packages/mcp-server/src/step-reconciliation.test.mjs`
- `plugins/kanmer/mcp/kanmer-mcp.cjs`
- `plugins/kanmer/skills/kanmer-auto/SKILL.md`
- `plugins/kanmer/skills/kanmer-execute/SKILL.md`
- `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md`
- `scripts/verify-skill-prose.mjs`
- `scripts/verify-skill-prose.test.mjs`

No implementation blocker remains. Unsupported or unobservable link targets and unavailable authority stay fail-closed rather than being guessed into PASS.
