## Review hand-off — 2026-08-28

- **PR:** https://github.com/collisionengineers/kanmer/pull/303
- **Head SHA:** `abf707d98a2ddbde02dafb31cc652c72bbea73b6`
- **Base:** `origin/main` `70d23efd`
- **Branch / worktree:** `core-132-release-channel-leases` / `.worktrees/core-132` (kept; the ticket stays taken through review, verify and closeout)
- Ticket moved Implementing → Review after `get_doc_gates` reported the boundary passable.
- The author does not review, merge, resolve review threads, file follow-up tickets or start another ticket. `main` sets `required_conversation_resolution: true`, so the PR will read `BLOCKED` until a reviewer resolves its threads — that is expected, not a defect.

2026-08-31 final root-cause remediation head: `244e9143abffb2066db4e8e9912e4122a3b79b9e` (verified with `git rev-parse HEAD`). Corrected a transient board metadata typo immediately; this exact SHA is authoritative. The pass fixes coherent fail-closed release snapshots, serializes delivery-policy writes with candidate minting, replaces every candidate wildcard, refuses Windows device channels, indexes successor evidence, and resolves configured integration branches through `refs/heads`. Focused results before push: core release 67/67, full core 629/629, MCP release 20/20, core and MCP typechecks PASS, plugin/skill/AGENTS/manual checks PASS.

Exact-head verification for `244e9143abffb2066db4e8e9912e4122a3b79b9e`: clean detached Windows checkout `npm ci` PASS and complete `npm run verify` PASS. Counts: core 629/629 (release 67/67), GUI 524/524, MCP 164/164 (release 20/20), scripts 155/155, smoke 348/348, protocol 50/50, discovery 13/13, AGENTS 31/31; typecheck, docs, skills, headless, MCPB and plugin byte identity PASS. Hosted `verify` and `kanmer-gate` also PASS at the same head; board re-gate used synced board SHA `95c97b7971d1b96ce98882a27a67853a463b9fb7`.

## Final invariant correction — exact PR head `e31f2fdc5f740d3c7dbad8fb5175bc9839f7b041`

The exact-head automated review at predecessor `244e9143abffb2066db4e8e9912e4122a3b79b9e` found two remaining release-record acceptance gaps. This single consolidated correction now:

- validates configured, minted and persisted concrete Git branch names, including malformed wildcard patterns, without shelling out inside a lock;
- validates the complete immutable predecessor/successor graph, while preserving failed predecessors byte-for-byte with their documented one-way child link;
- fails release evidence closed when an immutable attempt link is missing or contradictory.

Focused evidence at the amended head: core release/delivery tests 127/127 PASS; full core 641/641 PASS; core typecheck PASS; plugin byte-identity check PASS; skills/AGENTS/docs/manual checks PASS. A representative validator matrix matched local `git check-ref-format --branch`, including Git's valid `@` and reserved exact `HEAD` cases. The complete clean-checkout rail and hosted exact-head checks remain to be recorded separately before review attestation.

## Exact-head review correction — `ce2645cb082ff5d2a86240c5ae67cffa0f9310f5`

The final automated review at predecessor `e31f2fdc5f740d3c7dbad8fb5175bc9839f7b041` identified four remaining release invariants. One consolidated root-cause correction now:

- treats public lease id/revision as CAS only; ordinary renew/record/complete/fail also require the actual per-request actor, while supersede retains its explicit expired/operator-authorised path;
- refuses action-inapplicable fields before Git or mutation and refuses contradictory unavailable/recovered observations;
- follows the immutable successor chain when a successor deliberately drops a predecessor ticket from its fresh roster, so reconciliation cannot preserve stale superseded evidence forever;
- documents the actor, field, and causal-scope contracts in AGENTS.md and the canonical tool inventory.

Focused evidence at the amended head: core release 78/78 PASS; MCP release 21/21 PASS; protocol smoke 349/349 PASS; core/MCP typechecks PASS; plugin byte identity, skills, AGENTS 31/31, and docs/manual checks PASS; `git diff --check` PASS. The prior detached full rail at `e31f2fdc...` passed after one retained setup INCONCLUSIVE caused by installing dependencies in the wrong worktree. A clean detached full rail and hosted checks for this new exact head remain pending and will be recorded before attestation or merge.
