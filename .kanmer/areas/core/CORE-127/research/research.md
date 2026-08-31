# Research — CORE-127: enforce constrained step packets against actual workspace changes

## Scope and current base

Audited exact `origin/main` `c1bc3be8532150832328a6d7f62ecd94cdcf6220` after CORE-132. CORE-126 remains the sole shared-core implementation PR; CORE-127 is preparation-only until CORE-126 merges and is then rebased onto that merge.

The governing contract is `docs/functional/frd/FRD-033-constrained-preparation-and-step-packets.md`, plus HZN-008 `context.md`. [[CORE-118]] supplies the current pure plan parser and `step-packet/1` compiler; [[CORE-122]] and [[CORE-131]] supply the read-only reconciliation collector/classifier and separately authorised apply surface. This ticket extends those existing surfaces and adds no workflow tool, stage, database, scheduler or writer.

## Live defects

### Path authority is not confined

- `packages/core/src/plan.ts::normalisePlanPath` trims and normalises separators but accepts `..`, absolute POSIX paths, drive/UNC paths, URI-like values, empty/dot paths and unsupported pattern syntax.
- `stepFindings` checks `## Do not modify` with exact `Set.has`, so a documented pattern such as `apps/gui/**` does not match `apps/gui/src/main.ts`.
- A detector that trusts those values would misclassify an out-of-repository or glob-matched change as authorised.
- The correct seam is one dependency-free repo-relative path parser and one documented glob subset shared by compilation and reconciliation. Literal paths, `*` within one segment and `**` across segments are sufficient; unsupported syntax fails closed.

### Evidence can be stale or falsely pinned

- `evidenceFindings` validates supplied pins but treats an unknown pin as advisory and satisfies `requireEvidencePin` by nonzero pin count rather than a live match.
- `getExecutionPacket` reads documents/group context before obtaining the ticket revision. A concurrent edit can pair stale bytes with a newer revision.
- `StepPacket` carries plan/research/files/group-context versions, but not checklist version/state and no issuance-time Git baseline.
- Exact plan, research, files and group-context versions must be reconstructed and compared. Missing or unreadable evidence is inconclusive, never a pass. Snapshot collection must retry a bounded number of times or refuse if the document-inclusive revision changes around the reads.

### Actual worker changes are not observable against the packet

- `workspaceEvidence` reduces porcelain status to clean/dirty and discards paths.
- `reconcileTicket` accepts only a ticket id and has no packet-aware branch.
- A packet id is a digest, not a server-side record; it cannot recover authorised files or evidence versions by itself. The caller must supply the complete exact packet, whose canonical digest is revalidated.
- A current dirty-path set alone is insufficient. A later step would falsely attribute earlier uncommitted changes, and a file already dirty at issuance could change again without appearing as a newly dirty path.
- The packet therefore needs a bounded issuance-time workspace baseline: exact branch and HEAD plus canonical fingerprints for index/worktree/untracked path state. Reconciliation compares a fresh snapshot with that baseline and reports the paths whose state changed during the worker step.
- Git status must be parsed as NUL-delimited porcelain so spaces, Unicode and rename source/destination paths are not lost. Every observed path is confined through the same strict parser.

### Nothing prevents the next packet after an unverified step

- `step: "next"` selects from checklist boxes only.
- The controller prose says to reconcile, but the server does not require a prior reconciliation result before issuing a later step.
- The bounded extension is an optional complete `prior_step_packet` input on the existing `get_execution_packet` call. For a requested step after step 1 (including `"next"` resolving beyond step 1), the server runs the same packet classifier used by `reconcile_ticket` and emits no new packet unless the prior result is PASS. The fresh accepted snapshot becomes the next packet's baseline.
- Step 1 may be issued without a prior packet only from a proven recorded worktree/branch. Whole-ticket packets keep their current setup role and remain compatible.

## Existing helpers to reuse

- `parsePlan`, `validatePlan`, `compileStepPacket`, `contentVersion` and the canonical packet digest in core.
- `gitCommonDirectory`, bounded command execution and recorded workspace identity checks already used by `execution-packet.ts` and `reconciliation.ts`.
- `KanmerStore.getRevision`, `getDocWithVersion`, `getGroupDoc` and warning-aware group/ticket reads.
- `reconcileEvidence` remains the delivery/claim classifier. Step reconciliation is an additive typed result in the same read-only response and creates no `ReconciliationAction`.
- Existing MCP registrations `reconcile_ticket` and `get_execution_packet`; no new general tool.

## Required result contract

A supplied packet is accepted for inspection only when its version, deterministic digest, logical project, ticket, batch, workspace, branch/HEAD baseline and document identities are all valid. The step result is one of:

- `pass`: every changed path is allowed, none is forbidden/undeclared, all evidence versions are current, the authorised checklist step is complete, and every required fact is conclusive;
- `fail`: typed forbidden, undeclared, stale or plan-deviation findings exist;
- `inconclusive`: the workspace/evidence/baseline cannot be read or proven safely.

The read-only call writes no ticket, document, activity, Git or release state. A later packet is refused on both FAIL and INCONCLUSIVE.

## Negative cases to prove

- Reject `../x`, nested traversal, `/etc/hosts`, drive paths, UNC paths, `file://`, URLs, empty/dot, NUL and unsupported glob syntax. Benign `./` and backslashes normalise consistently.
- `apps/gui/**` matches descendants; `*` does not cross `/`; regex metacharacters are literal; an allowed literal is not a prefix grant.
- Classify allowed-only, forbidden, undeclared, renamed source/destination, untracked, spaces and Unicode paths.
- Refuse tampered packets and wrong version/digest/project/ticket/batch/workspace.
- Independently detect stale plan, research, files, group context and checklist; missing/deleted evidence and concurrent snapshot drift are inconclusive.
- Refuse an unticked authorised step and any next-step request without a PASS for the exact prior packet.
- Detect another change to a path that was already dirty at packet issuance.
- Missing/unreadable worktree, command timeout/overflow, foreign repo, branch mismatch and detached HEAD are inconclusive/refused, never PASS.
- Byte-compare board, ticket and activity files before/after packet-aware reconciliation.

## Compatibility and sequencing

The wire shape is additive but the packet contract changes, so bump it to `step-packet/2`; do not silently reinterpret `step-packet/1` as carrying a baseline. Existing whole-ticket requests stay compatible. Stable v0.3.12 remains the live board authority because this work persists no new board field or schema.

Implement only after CORE-126 merges, reusing its final batch workspace projection and actor rules. CORE-133 follows CORE-127 because both touch reconciliation. No unresolved product question remains.
