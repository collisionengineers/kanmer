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

## Commits

- `5a8c5faef89a70b2f4c8b350e1f9314cc6fa62c6` — Enforce constrained step reconciliation.
- `fbeab7630d6d287c90f1d59da596890ae507b0be` — Prove glob authority with exact containment.
- `fc242c3c8fc8c97d2fbb7c9948af3f7d537c4de7` — Harden constrained step packet reconciliation.

Pull request: #307.

## Verification

The earlier authoritative clean Windows rail passed at `fbeab7630d6d287c90f1d59da596890ae507b0be` from 2026-08-31T19:42:03.9968632Z through 2026-08-31T19:53:22.8472351Z on Windows, Node v24.15.0 and npm 11.14.1. Because source changed afterward, it is historical evidence only; a fresh full rail is required at `fc242c3c8fc8c97d2fbb7c9948af3f7d537c4de7`.

Focused remediation evidence at exact head `fc242c3c8fc8c97d2fbb7c9948af3f7d537c4de7`, all exit 0:

- Core plan + packet: 106/106 PASS.
- Workspace/document collector: 19/19 PASS, including a real linked worktree nested under a dedicated board.
- Reconciliation: 37/37 PASS.
- MCP smoke: 380/380 PASS.
- Protocol: 50/50 PASS.
- Skill-prose mutation suite: 53/53 PASS; canonical skill verification PASS.
- Script tests: 161/161 PASS.
- AGENTS block: 31/31 PASS.
- Core/MCP builds and all-workspace typecheck: PASS.
- Plugin roster and byte identity: 41 tools, 12 skill frontmatters, isolated handshake PASS.
- `git diff --check`: PASS; worktree clean.

Failed-first evidence is retained: the first core run was 94/95 because the old null-checklist fixture expected issuance; the first smoke run exposed batch fixtures with no mapped checklist marker and a downstream dereference; and the first skill verification exposed two overly narrow new prose pins. Each was corrected within the authorized assertions/fixtures/prose and the complete implicated command then passed. A mistaken invocation of a nonexistent workspace smoke script exited before running tests; the documented direct smoke command subsequently ran 380/380.

## Review disposition

The prior exact-head automated and independent review at `fbeab7630d6d287c90f1d59da596890ae507b0be` produced five current findings: recursive path-matching exhaustion, constrained issuance without a checklist marker, newline normalization accepting rewritten checklists, duplicate group evidence, and a dedicated-board descendant worktree bypass. They were addressed together in commit `fc242c3c8fc8c97d2fbb7c9948af3f7d537c4de7`. Exact-head automated settlement and one bounded independent delta review are pending.

An earlier major containment issue was already fixed in `fbeab7630d6d287c90f1d59da596890ae507b0be` by replacing constructive subset proof with exact bounded whole-path language containment/intersection. Its independent symbolic oracle covered 17,295 containment relations without mismatch.

A resource bound remains intentional: automaton proof exhaustion produces `PLAN_GLOB_COMPLEXITY` and refuses authority. Runtime path-membership exhaustion is separately surfaced as INCONCLUSIVE. Neither can silently authorize a path.

## Scope confirmation

All changed source, test, prose, and generated files are in the versioned files/plan packet. CORE-126 batch ownership, CORE-133 abandoned-workspace routing, CORE-129 proof consistency, GUI behavior, workflow stages, release records, provider configuration and unrelated local state were not absorbed.
