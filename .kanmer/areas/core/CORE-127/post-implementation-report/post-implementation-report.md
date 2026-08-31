# Post-implementation report — CORE-127

## Outcome

Implemented constrained-step reconciliation on exact base `4fda54b4489fa4bc4b6b091c2af67715245ffa08` without adding a tool, stage, write surface, dependency, database, or persisted packet store.

- Strictly parses declared and Git-observed repository-relative paths.
- Supports literal paths, segment-local `*`, and whole-segment `**`.
- Proves authority containment and forbidden overlap with bounded exact automata; proof-budget exhaustion is explicit and fails closed.
- Versions the packet contract as `step-packet/2`, including exact checklist, document, branch, HEAD, and workspace-baseline evidence.
- Compares actual Git changes with the exact retained packet, including rename endpoints and paths already dirty at issuance.
- Extends the existing read-only `reconcile_ticket` result while preserving the ordinary recommendation.
- Refuses another constrained packet unless the complete exact prior packet reconciles PASS.
- Updates AGENTS.md, canonical skills/tool reference, prose guards, tests, and the committed standalone MCP bundle.

## Commits

- `5a8c5faef89a70b2f4c8b350e1f9314cc6fa62c6` — Enforce constrained step reconciliation.
- `fbeab7630d6d287c90f1d59da596890ae507b0be` — Prove glob authority with exact containment.

Pull request: #307.

## Verification

Authoritative clean Windows rail at exact reviewed head `fbeab7630d6d287c90f1d59da596890ae507b0be`:

- Command: `npm run verify`
- Result: PASS, exit 0
- Started: 2026-08-31T19:42:03.9968632Z
- Finished: 2026-08-31T19:53:22.8472351Z
- Environment: Windows, Node v24.15.0, npm 11.14.1

Focused final-source evidence:

- Core plan + packet: 95/95 PASS.
- Workspace collector: 17/17 PASS.
- Reconciliation: 37/37 PASS.
- MCP smoke: 378/378 PASS.
- Protocol: 50/50 PASS.
- Script tests: 161/161 PASS.
- AGENTS block: 31/31 PASS.
- Core/MCP typecheck and builds: PASS.
- Plugin roster and byte identity: 41 tools, PASS.
- Independent symbolic oracle: 17,295 containment relations, no mismatch.

## Review disposition

The independent pre-PR exact-head review found one major issue in the first implementation: constructive path-level containment falsely refused valid narrower `**` declarations. It was fixed as one root-cause remediation by replacing that subset proof with exact bounded whole-path language containment/intersection. The delta review on `fbeab7630d6d287c90f1d59da596890ae507b0be` passed with no blocker or major finding.

A resource bound remains intentional: automaton proof exhaustion produces `PLAN_GLOB_COMPLEXITY` and refuses authority. Canonically identical normalized globs bypass proof construction. This is fail-closed, explicit behavior rather than a silent authorization or an `undeclared` misclassification.

## Scope confirmation

All changed source, test, prose, and generated files are in the versioned files/plan packet. CORE-126 batch ownership, CORE-133 abandoned-workspace routing, CORE-129 proof consistency, GUI behavior, workflow stages, and release records were not absorbed.
