# Plan

## Objective

Remove the structural verification clog by adding a truthful, explicit terminal-failure retirement path using Kanmer's existing archive model, without weakening Done or inventing a seventh stage.

## Starting state

`kanmer-verify` requires all non-PASS outcomes to stay in Verifying indefinitely. CORE-103 demonstrates the resulting stale active card after an immutable failed release gained a successor.

## Governing docs

- FRD-007 keeps the six stages fixed and Done synonymous with verified; amend it to state that explicitly disposed non-success outcomes retire through archive while retaining their last stage.
- FRD-015 already makes archive the reversible retirement surface; amend it to require preserved proof/status and an explicit reason/successor for terminal verification failures.

## Required changes

1. In `kanmer-verify`, classify a non-PASS outcome as retryable by default. Permit terminal retirement only when the failure is irrecoverable or superseded and an operator explicitly supplies a reason plus either a successor ticket or a no-successor disposition. Require truthful proof, Outcome note, link, archive, and handoff to closeout; never move it to Done.
2. In `kanmer-closeout`, support both verified-Done and archived-Verifying entry paths. For the latter, confirm merged PR and final non-PASS proof, preserve status and archive, record traceability/outcome, safely remove worktree/branch, and release the ticket.
3. In `kanmer-auto`, keep failed verification as a stop until operator disposition exists, then route the ticket through the verifier/closeout retirement path rather than leaving an undirected permanent block.
4. Amend FRD-007 and FRD-015. Update `scripts/agents-block-body.mjs`, its fallback fenced copy in kanmer-setup, and refresh `AGENTS.md` with the rule that Done requires PASS while explicitly disposed terminal failures are archived and released.
5. Extend `verify-skill-prose.mjs` with semantic assertions covering retryable default, explicit operator/successor requirement, never-Done rule, closeout path, and auto routing.
6. Run focused prose/AGENTS tests and the authoritative repository verification rail.
7. Open a protected PR for independent review. After merge, exact-SHA verify and close out SKILL-035. Only then use the shipped workflow to retire CORE-103.

## Expected files

Only the nine change-scope paths in `files/files.md`.

## Do not modify

Core schemas, stage constants, GUI code, release scripts, package versions, release tags/assets, or ticket files directly.

## Constraints

Use existing archive/link/proof/outcome/taken mechanisms. No new dependency. No automatic archival based on age or inferred similarity. A non-PASS result is never represented as Done.

## Acceptance checks

- `node scripts/verify-skill-prose.mjs`
- `node scripts/verify-agents-block.mjs`
- `npm run verify`
- Manual content check that CORE-103 can be retired only with its preserved FAIL evidence and explicit CORE-107 successor.

## Commands

Run the three acceptance commands from the ticket worktree; record exact exit codes.

## Failure and deviation rules

Any wording that allows automatic retirement, hides failed proof, or moves non-PASS work to Done is a failure. Scope growth into schema/UI or release work requires a separate ticket. The canonical AGENTS body path was corrected from the planning assumption to `scripts/agents-block-body.mjs` after the focused verifier exposed the actual import structure.

## Stop condition

Stop with an open PR, SKILL-035 in Review, all checks recorded, and no mutation yet to CORE-103.
