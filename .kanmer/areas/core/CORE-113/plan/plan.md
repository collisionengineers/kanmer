---
kind: implementation-plan
ticket: CORE-113
revision: controlled-post-delta-replan
status: approved-for-one-final-remediation
---

# CORE-113 controlled post-delta remediation plan

## Authority and fixed starting point

This is the one authorised automatic replan after the independent delta review of PR #286 at `83279d14638e874bd98ccf764ccd7844897c6993`. It keeps all review remediation in CORE-113; it does not create a related ticket, reopen architecture, or broaden into CORE-114/115/116.

The original implementation is `61927fffeced9f216d5849667357e63964345f2d`. The earlier P1 correction is `83279d14638e874bd98ccf764ccd7844897c6993`. The current live review has thirteen non-outdated findings: seven major evidence/safety findings and six minor contract/test findings. F-001 is already fixed and is not part of this batch.

The first CI retry passed `verify` at the current head. `kanmer-gate` remains blocked only by the unsynchronised remote board state, not a source defect; retain that fact as external release evidence rather than changing source to mask it.

## Governing constraints

- Satisfy FRD-028 and HZN-008's rescue/reconciliation boundary.
- Keep core reconciliation pure: no shelling out and no environment-specific paths.
- Keep reconciliation dry-run first, fail closed on unavailable or ambiguous evidence, never delete a worktree, and never act on the board worktree.
- Use fixed argv for every GitHub and Git invocation. Do not interpolate a PR selector, SHA, path, or branch into shell text.
- Add no dependency, tool, command, feature, persisted release-attempt schema, or compatibility workaround.
- Preserve the existing 39-tool roster. The two existing reconciliation operations remain cross-system operations and accurately advertise `openWorldHint: true`.
- One consolidated remediation commit only. After its fresh independent delta review, do not begin a third remediation loop: a material remaining major is a terminal stop for CORE-113.

## Scope and evidence model

The change must make collected evidence distinguish truth from absence:

1. A passing proof is valid only with complete proof-record metadata: a recognised `kind`, valid result, non-empty environment, valid verified timestamp, and an attempts array. A pass must still be tied to the exact merged SHA before it can advance a ticket.
2. Required check status is obtained from GitHub's required-check view, not inferred from every rollup check. Explicitly distinguish pass, fail, pending, unavailable, and not-applicable.
3. Every ticket commit recorded for a merge route is proved reachable from the exact merge target with a fixed-argv Git helper; a candidate may not rely on a broad local history or a fabricated base range.
4. A PR reference is selected from the ticket's recorded references without reducing a full URL to its number. Cross-repository or ambiguous references are unavailable evidence; the collector must not query an unintended same-number PR.
5. Workspace evidence reports missing only for ENOENT. Any other stat failure is unavailable. A terminal claim release additionally proves the recorded worktree belongs to the claimed source repository and recorded branch and is clean; foreign, detached, mismatched, missing, dirty, or unavailable evidence prevents release.
6. Release evidence is `not-applicable` when this ticket class has no release observation, never a fabricated `none`; unread expected release evidence stays unavailable.
7. The policy distinguishes a safely recoverable merged Review ticket with dirty workspace (propose Review → Verifying, preserve the dirty-worktree warning) from terminal claim release (which remains fail-closed).
8. Apply uses the same legacy-claim predicate as policy, and its audit record identifies the old and new controller fields where a release changes them.

## Ordered implementation

1. Extend the reconciliation evidence types and pure policy in `packages/core/src/types.ts` and `packages/core/src/reconciliation.ts`. Add only the facts needed to represent authentic proof, target-commit reachability, PR selection, workspace identity, and a non-fabricated release state. Update the core matrix tests for all allowed and forbidden transitions.
2. Harden the MCP collector in `packages/mcp-server/src/reconciliation.ts`:
   - validate and preserve the selected recorded PR selector;
   - invoke `gh pr checks <selector> --required --json state,bucket` with fixed argv;
   - use a focused extension of `git-reachability.mjs` to test every recorded commit against the exact merge target;
   - validate full proof metadata;
   - classify filesystem failures precisely and use fixed-argv Git identity/branch/cleanliness probes;
   - collect `not-applicable` release evidence where release collection is outside this ticket's authority.
3. Align `packages/core/src/store.ts` apply validation and activity/audit payload with the policy's accepted legacy-claim shape. Do not introduce a second claim predicate.
4. Correct the reconciliation registrations in `packages/mcp-server/src/index.ts` and their smoke assertions to mark the real external Git/GitHub reads accurately. Add `reconciliation.test.mjs` to the MCP HTTP test rail in `packages/mcp-server/package.json`.
5. Expand `packages/mcp-server/src/reconciliation.test.mjs` and `packages/core/src/reconciliation.test.ts` to cover each thirteen-thread result, including: incomplete proof; required-only check selection; unreachable commit; cross-repo/ambiguous and non-first PR selection; ENOENT versus other stat failures; repository/branch identity; dirty merged Review; not-applicable release; legacy claim parity; audit fields; open-world annotations; and normal test-runner inclusion.
6. Regenerate the committed plugin MCP bundle only if its source changed. Run focused tests, build/smoke/plugin checks, then the full `npm run verify` suite in the recorded CORE-113 worktree.
7. Record exact command outcomes, SHA, changed files, and retained CI/board-sync fact in the post-implementation report and checklist; update the ticket's commit list; push the one final remediation commit to PR #286. The next action is one fresh, bounded, independent delta review of only this final head.

## Planned file map

Modify only if required by the implementation:

- `packages/core/src/types.ts`
- `packages/core/src/reconciliation.ts`
- `packages/core/src/reconciliation.test.ts`
- `packages/core/src/store.ts`
- `packages/mcp-server/src/reconciliation.ts`
- `packages/mcp-server/src/reconciliation.test.mjs`
- `packages/mcp-server/src/git-reachability.mjs`
- `packages/mcp-server/src/index.ts`
- `packages/mcp-server/src/smoke.mjs`
- `packages/mcp-server/package.json`
- the generated plugin bundle required by the repository's plugin build

Do not modify board configuration, governing documents, GUI code, release implementation, public tool-reference text, or work belonging to CORE-114/115/116.

## Acceptance matrix

- A complete exact-SHA PASS proof and a required-check PASS are necessary for Verifying → Done; incomplete metadata, wrong SHA, unavailable evidence, a required failure, or pending checks never advance it.
- A merged Review ticket with valid merge/commit evidence can propose Verifying even when the implementation worktree is dirty, while preserving that warning; no terminal release occurs without identity-matched clean evidence.
- Missing PR, check, Git, filesystem, or release evidence is visible and fail-closed. A cross-repo PR URL and an unreachable recorded commit cannot drive a state change.
- Dry-run leaves the store untouched; apply re-collects identical evidence/revision, rejects drift, and writes an auditable controller transition.
- Existing tool names and count remain unchanged; reconciliation operations announce external-world access.
- The final head has passing required checks and a fresh independent review contains no unresolved blocker/P1/major finding. The remote board is synchronised through the approved board workflow before merge.

## Stop condition

This plan authorises one final CORE-113 code-remediation batch. If the fresh post-batch independent review still identifies a material blocker/P1/major in this scope, stop CORE-113 for operator disposition instead of creating more remediation tickets or continuing automatic review cycles.
