# Post-implementation report — CORE-127

## Outcome

Implemented constrained-step reconciliation on exact base `4fda54b4489fa4bc4b6b091c2af67715245ffa08` without adding a tool, stage, write surface, dependency, database, or persisted packet store.

- Strictly parses declared and Git-observed repository-relative paths.
- Supports literal paths, segment-local `*`, and whole-segment `**`.
- Proves authority containment and forbidden overlap with bounded exact automata; proof-budget exhaustion is explicit and fails closed.
- Uses bounded iterative tri-state path membership and linear segment matching; matcher exhaustion becomes INCONCLUSIVE and can never authorize a path.
- Versions the packet contract as `step-packet/2`, including exact checklist, document, branch, HEAD, and workspace-baseline evidence.
- Refuses constrained issuance unless the selected step maps to at least one unchecked checklist marker.
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
- Hashes a bounded `git ls-files -v -z` census in both samples and refuses assume-unchanged or skip-worktree authority without mutating the index.

## Commits

- `5a8c5faef89a70b2f4c8b350e1f9314cc6fa62c6` — Enforce constrained step reconciliation.
- `fbeab7630d6d287c90f1d59da596890ae507b0be` — Prove glob authority with exact containment.
- `fc242c3c8fc8c97d2fbb7c9948af3f7d537c4de7` — Harden constrained step packet reconciliation.
- `5302e445dc70714e89762dc19fb96754490e3fa9` — Harden constrained execution evidence.

Pull request: #307.

## Verification

The clean Windows `npm run verify` rail passed at exact prior head `fc242c3c8fc8c97d2fbb7c9948af3f7d537c4de7` from 2026-08-31T20:58:44.5293965Z through 2026-08-31T21:10:01.7598092Z on Windows, Node v24.15.0 and npm 11.14.1. Hosted `verify` also passed there in Actions run 33438698598. Because source changed afterward, both are historical evidence only.

Final focused remediation evidence at exact head `5302e445dc70714e89762dc19fb96754490e3fa9`, all exit 0:

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

A fresh clean Windows `npm run verify`, hosted `verify`, exact-head automated review settlement, independent delta review and board-synced `kanmer-gate` are controller work and remain pending at this final head.

## Review disposition

F-001 through F-005 remain fixed in `fc242c3c8fc8c97d2fbb7c9948af3f7d537c4de7`. The four exact-head majors from the next review are addressed together in `5302e445dc70714e89762dc19fb96754490e3fa9`:

- F-006: one pre-I/O counted-document plus unique-group bound is shared by whole-ticket and constrained paths.
- F-007: literal parsing/equality and wildcard work consume the same aggregate budget before work.
- F-008: path and handle identity/size/type/mode/link facts bracket a capped handle read.
- F-009: a bounded non-mutating index-flag census refuses hidden tracked authority and detects drift.

All nine GitHub threads remain open until the final exact-head automated and independent delta reviews settle. Their durable public dispositions and resolution are controller work; no finding is silently closed.

An earlier major containment issue was fixed in `fbeab7630d6d287c90f1d59da596890ae507b0be` by replacing constructive subset proof with exact bounded whole-path language containment/intersection. Its independent symbolic oracle covered 17,295 containment relations without mismatch.

A resource bound remains intentional: automaton proof exhaustion produces `PLAN_GLOB_COMPLEXITY` and refuses authority. Runtime path-membership exhaustion is separately surfaced as INCONCLUSIVE. Neither can silently authorize a path.

## Scope confirmation

All changed source, test, prose, and generated files are in the versioned files/plan packet. CORE-126 batch ownership, CORE-133 abandoned-workspace routing, CORE-129 proof consistency, GUI behavior, workflow stages, release records, provider configuration and unrelated local state were not absorbed.
