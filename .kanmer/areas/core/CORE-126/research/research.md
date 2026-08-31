# Research — CORE-126: make frozen batches pass the protected merge path

## Question

What is the smallest current-main correction that makes FRD-030 batch workspaces reachable through the real protected merge path, recoverable across an interrupted declaration, controller-owned, discoverable at closeout, and terminal before cleanup?

## Findings

- Exact base is origin/main c1bc3be8532150832328a6d7f62ecd94cdcf6220. The shared checkout is stale and is not an implementation base.
- packages/core/src/merge-gate.ts resolves one ticket. Distinct Kanmer footers are rejected as ambiguous, evaluateMergeGate checks one ticket, and packages/mcp-server/src/check-pr.mjs gathers evidence for one ticket. The documented batch PR therefore cannot pass kanmer-gate.
- A protected batch verdict must be roster-wide. For every frozen member it owes: exact Review stage, no open question, no live blocker, correct target, a valid independent attestation naming this PR and exact head, reachable recorded commits, and board-sync evidence. A passing leader cannot stand in for a failing sibling.
- The existing execute contract already requires one Kanmer footer per member. Keeping that explicit complete roster is safer than inventing a new batch footer or hiding membership behind one representative ticket. The gate can accept distinct footers only when their normalized set exactly equals one frozen batch; incomplete, extra, mixed-batch, or unbatched multi-ticket sets must fail closed.
- packages/mcp-server/src/index.ts summarise omits batch membership. The current closeout prose says to use list_items but neither exposes the batch id nor requires include_archived: true, so an archived member can disappear from cleanup discovery.
- packages/core/src/store.ts admits a same-batch ticket by workspace and branch only. The real calling actor is not compared with the batch controller, so another actor can take a frozen member while copying the visible owner string.
- validateBatchDeclaration exempts the declaring ticket from the taken-member refusal. A force retake can therefore create a batch after isolated implementation started.
- Batch membership is currently stamped through sequential atomic ticket writes before the taker's final write. A crash leaves a partial derived roster and retry sees BATCH_FROZEN. The board-wide write lock prevents concurrent writers but cannot make several renames crash-atomic.
- CORE-132 provides the proven local pattern: persist a strict write-ahead intent before a multi-file mutation, roll the exact intent forward after interruption, and fail closed on a conflicting or malformed record. CORE-126 should reuse that pattern and existing writeFileAtomic/withLeaseLock helpers, not the release-record types or a generic transaction engine.
- The declaration and first lease must be one transaction: deleting a membership-only journal before the taker lease would strand a complete but untaken roster after a crash. The strict record therefore freezes every membership and taker after-image before the first write, transitions pending to active only after all final bytes verify, and remains the authoritative original roster through release.
- A strict phase-specific batch sidecar is invisible to the v0.3.12 item scan, which walks areas only. Its full SHA-256 filename is derived from the canonical trimmed batch id. The pending variant carries only intent/generated facts and endpoint hashes from which legal patches are derived; the compact active/releasing variants retain the exact id, controller, frozen roster and shared workspace/branch without duplicating ticket bodies.
- Durable lease_batch_controller on every member is the minimal ownership evidence needed both for exact-actor later takes and for same-controller recovery of a partial declaration. MCP can pass its actual client actor separately from caller-supplied assignee/controller labels; direct core/GUI callers fall back to their existing actor identity.
- releaseTicket currently excludes the releasing member when it computes BATCH_ACTIVE. That conflicts with the frozen v0.3.13 acceptance: cleanup waits for every member, including the caller, to be Done or archived.
- CORE-125 serializes most ticket writers through withLeaseLock, but deleteItem is still unlocked and document writes can change a member revision while a pending transaction exists. Batch recovery needs bounded guards: deletion joins the existing lock and refuses pending/active/releasing members; every non-recovery member mutation is refused while pending or releasing. A warning-aware census plus direct member reads prevents malformed items from disappearing. No new lock architecture, stage, database, service, or workflow surface is needed.
- Exact-main renewal authorizes a modern lease by id/revision without comparing the request actor, while MCP currently substitutes caller-supplied assignee for that actor. Transfer and reconciliation can also replace one member's owner, and execution packets allow foreign exact-path resume. Those are same-invariant ownership bypasses: bind renew to the observed actor, refuse per-member batch transfer/recovery, and refuse foreign/pending/inconsistent packets without changing isolated behavior.

## Implications

- Extend the existing merge-gate contract to carry a normalized ticket roster while preserving single-ticket behavior. A multi-footer PR is valid only for the exact complete frozen roster, and its result exposes all mapped ids and the batch id.
- Gather and evaluate phase-2 evidence per member. Review validation must compare both the attested PR identity and the full head SHA.
- Add a strict pending/compact-active/releasing batch record and lease_batch_controller. Matching same-actor/exact-roster/exact-take-intent retries derive and roll forward only legal hash-bound patches; a different actor, roster, take intent, malformed/overlapping record, warning-tainted census, missing endpoint or contradictory bytes is retained and refused. The compact manifest prevents a lost/deleted stamp or partial release from shrinking the authoritative roster.
- Expose one batch summary block on list_items and make closeout explicitly query include_archived: true before any shared Git cleanup.
- Require every member to be terminal before release; retain the existing shared workspace, frozen roster, per-ticket documents, and no-new-tool design.

## Open questions

None. FRD-030 and the frozen release acceptance decide the observable behavior; implementation details are bounded by the existing lock, atomic-write, merge-gate, summary, and skill surfaces.
