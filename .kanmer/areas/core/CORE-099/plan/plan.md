# Plan — CORE-099: publish and validate the v0.3.6 successor release

## Approach

Release v0.3.6 as a separately traceable successor, never as a repair of v0.3.4 or v0.3.5. This follows the existing two-phase protected-main release contract: wait for DOC-023 to be Done; run one preparation command from a freshly verified clean normal GitHub-origin clone with process-scoped `KANMER_ROOT`; obtain independent review and normal protected-main merge; then run one publisher command from a second fresh clean clone at the recorded merge SHA with its credential present only in that process environment. It is preferable to retagging or manual repair because each phase has one auditable authority and an irreversible action occurs only after its preconditions pass.

## Governing docs

- **FRD-021 R3 — Meets.** The preparation phase uses the existing protected-main PR/check boundary, refuses stale release notes, and runs the shared verification rail that includes packaged updater verification. Publish proceeds only after the normal merge and exact reachable release-commit proof.
- **HZN-007 context — Meets.** Work remains ticket-scoped, moves only across adjacent gates, records exact outcomes, uses independent review/merge, preserves failures, and does not fabricate lifecycle or downstream proof.
- **Existing release owner — Applies without modification.** `scripts/release.mjs` remains the sole preparation/publisher authority; this plan changes no source, CI permissions, publishing semantics, or credentials.
- **GUI-131 merged proof — Applies without modification.** The existing publisher path builds the GUI before immutable tag creation/push. CORE-099 observes that behavior; it does not alter it.

## Preconditions and hold

1. Hold in Preparing until [[DOC-023]] reaches Done after its own normal review, merge, and merged-main proof. Re-read DOC-023 item, proof, links, and CORE-099 gates immediately before any execution packet/take.
2. Before preparation, read fresh `origin/main` and confirm the merged notes name `0.3.6`. In a newly created clean normal GitHub-origin clone, confirm the clone is on `main` with no tracked changes and that no `release/v0.3.6` branch, `v0.3.6` tag, GitHub Release, or release PR already exists. Install locked dependencies with `npm ci --ignore-scripts`.
3. Bind only the existing canonical board root for that process: set `KANMER_ROOT` to an injected `<canonical-board-root>` immediately before the release command. Do not copy, initialize, or edit a board in the clone, and do not hardcode a machine-specific path.

## Preparation phase

4. From that single rechecked normal clone, run exactly once:
   `npm run release -- 0.3.6 --ticket CORE-099`
   Do not run a dry run, second preparation, manual bump, or a hand-created release branch. Allow the existing script to create the generated `release/v0.3.6` branch and PR only.
5. Record every command exit, initial main SHA, release commit/head, PR URL/number/footer, generated changed-file set, `git diff --check`, and clean-tree state. The release script's shared verification output is evidence, not permission to skip later independent review.
6. Stop at the open PR in Review. An independent reviewer must assess the exact head and all required checks; resolve findings through the normal ticket process. The release author neither reviews nor merges.

## Normal merge and publisher phase

7. After a normal protected-main merge, record the full merge SHA. Create a second new clean normal GitHub-origin clone at that merge/main state; recheck clean `main`, matching `0.3.6` manifests, reachable full release-commit SHA, the existing immutable v0.3.4/v0.3.5 records untouched, and the absence of a pre-existing v0.3.6 tag/release.
8. Set `KANMER_ROOT` to the injected canonical board root for the publisher process only. Supply any publisher credential only to that same process environment; never print, save, add to source/CI/ticket documents, or reuse it for a manual GitHub operation.
9. Run exactly once:
   `npm run release -- 0.3.6 --publish --release-commit <full-merged-sha>`
   The existing script must complete its preconditions and GUI build before it creates/pushes `refs/tags/v0.3.6`. CORE-099 performs no out-of-band tag, release, asset, package, or repair command.

## Evidence and downstream limits

10. On publisher success, record sanitized release-script output; immutable v0.3.6 tag target; public non-draft GitHub Release; and `node scripts/verify-release-assets.mjs 0.3.6` exit/output. Await the tag-triggered read-only `release-verify` workflow to a terminal result and record its URL/result. Record updater-facing visibility only as actually observed; do not claim an installed two-version cycle without its own evidence.
11. Append only the exact v0.3.6 facts relevant to [[CORE-036]] and [[CORE-042]] through Kanmer MCP: tag SHA, public-asset verifier result, tag-workflow result, and any observed updater evidence. Do not change their stage, checklist, proof, acceptance decision, or historical evidence.
12. Hand off merged-main proof and any closeout decision to independent later owners. CORE-099's author does not self-review, merge, self-verify, or close out.

## Success conditions

- DOC-023 is Done before any invocation.
- Exactly one clean-clone preparation invocation produces a script-generated v0.3.6 release PR, independently reviewed and normally merged.
- Exactly one clean-clone publisher invocation completes from the full merged SHA with `KANMER_ROOT` bound and a process-local credential.
- The publisher's existing pre-tag GUI build succeeds, v0.3.6 tag/release/assets are publicly verifiable, and the tag workflow reaches a recorded terminal result.
- Only scoped facts are propagated downstream; v0.3.4/v0.3.5 remain unchanged.

## Failure and stop conditions

- If DOC-023 is not Done, any preflight census fails, the clone/board binding is wrong, or the v0.3.6 branch/tag/release/PR already exists unexpectedly: stop before invoking the release script, record the exact state, and request direction. Do not improvise a correction or create a parallel branch.
- If preparation, PR checks/review, normal merge, publisher, GUI build, tag workflow, release visibility, or asset verification fails: record exact exit/status and stop that phase. Do not retry, retag, create a second package, manually upload or edit assets/releases, or use an administrative bypass.
- If a single existing release-script invocation reports its own bounded recovery behavior, record the factual result only; do not perform any additional operator-driven repair command.
- Any newly discovered source defect becomes a separate ticket; CORE-099 remains release orchestration only.

## Current stop condition

This planning assignment ends with CORE-099 in Preparing, planned but untaken and blocked by DOC-023. It creates no source worktree/branch, release branch/PR, tag, package, publisher invocation, GitHub Release, or proof.
