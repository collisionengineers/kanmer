# Plan — CORE-101: Publish and validate the v0.3.7 successor release

## Approach

Hold CORE-101 in Preparing until [[DOC-024]] is Done. Then run the existing two-phase release process exactly once per phase from separate fresh clean GitHub-origin normal clones: preparation creates the generated release PR; independent review and protected-main merge create the sole eligible publisher input; publisher creates the immutable v0.3.7 release. This reuses the merged CORE-100 artifact contract and existing strict verifier rather than modifying source, relaxing checks, or attempting to repair historical releases.

## Governing docs

- **FRD-021 auto-update — meets.** The plan requires version-specific notes before preparation, a normal protected-main PR/check/merge boundary, a pre-tag GUI build, package/updater validation, a visible non-draft release, and strict externally verified updater assets.
- **HZN-007 context — meets.** CORE-101 stays in Preparing until its typed dependency is Done; all board documents are MCP-written; the author never self-reviews or merges; every phase records exact exits; proof is deferred to merged main; and credentials remain absent from source/board evidence.
- **CORE-100 verified forward contract — meets.** v0.3.7 must retain the explicit `Kanmer-Setup-<version>.exe` configuration and strict presence/state/size/digest/`latest.yml` verification. No dotted-name alias or verifier weakening is permitted.

## Hold condition

1. Do not take CORE-101, create a worktree or source branch, open a PR, invoke a release command, tag, publish, or change release state while [[DOC-024]] is not Done.
2. When DOC-024 reaches Done, re-read CORE-101/DOC-024 items, links, gates, checklist/proof, HZN-007 context, current protected-main SHA, and the release script. Confirm the block is cleared and document the fresh execution packet before taking CORE-101.
3. If DOC-024 or any preflight condition is not satisfied, record the factual hold and stop. Do not substitute a release-notes edit, manual branch, or release action.

## Steps

1. **One preparation invocation.** After the hold clears, create a freshly rechecked normal clone from GitHub `origin/main` (not a worktree and not the root checkout). Confirm the clone is clean, on exact current `main`, and the local head equals `origin/main`; confirm current manifests report 0.3.6, `apps/gui/release-notes.md` names 0.3.7, and no `refs/heads/release/v0.3.7`, `refs/tags/v0.3.7`, v0.3.7 GitHub Release, or v0.3.7 release PR exists.
2. Install the lockfile with `npm ci --ignore-scripts`. In only that command process, bind `KANMER_ROOT` to the already-existing canonical board root returned by `get_status.projectRoot`. Run exactly once: `npm run release -- 0.3.7 --ticket CORE-101`. Do not dry-run, hand-create the branch, rerun, or manually edit generated artifacts.
3. Preserve the full sanitized command outcome: clone/base SHA, exit code, generated branch/commit/PR/footer/diff, hosted required checks, and final clean-tree state. On a non-zero exit or unexpected mutation, stop before any retry or repair.
4. **Independent review and normal merge.** An independent reviewer validates the exact release-PR head and terminal checks. Resolve any review finding through normal ticketed work. The release author does not review, merge, or use a protection/admin bypass. Record the normal protected-main merge SHA only after merge.
5. **One publisher invocation.** In a second fresh clean GitHub-origin normal clone at the merged `main`, verify clean tree, exact main/upstream SHA, full reachable release-commit SHA, every release manifest at 0.3.7, and absence of pre-existing `v0.3.7` tag/release. Bind the same canonical `KANMER_ROOT` only in the process environment. Supply an authorized publisher credential only to that process and run exactly once: `npm run release -- 0.3.7 --publish --release-commit <full-normal-merge-sha>`.
6. The publisher must build and await the GUI before tag creation, create/push only `v0.3.7`, package/publish once, and use its existing single exact-file recovery only if the script itself selects it. CORE-101 must not issue an outer retry, second package, manual upload, tag/release edit, retag, or repair. Any non-zero publisher result is terminal evidence and stops the ticket before improvisation.
7. **Strict release evidence.** On publisher success, record that the tag resolves to the recorded merge SHA; that the GitHub Release is non-draft/non-prerelease and visible; and that `node scripts/verify-release-assets.mjs 0.3.7 --dir apps/gui/release` exits 0, including the installer, blockmap, MCPB, uploaded state, size, SHA-256, and `latest.yml` path/size/digest bridge. A FAIL (1) or INCONCLUSIVE (2) stops the ticket; neither is converted to PASS.
8. Read the tag-triggered `release-verify` run to a terminal result and require success. Record its URL/run id and relevant final output; it is independent non-publishing verification, not a publication/recovery authority.
9. Append only sanitized factual v0.3.7 tag/release/asset/latest.yml/workflow evidence to [[CORE-036]] and [[CORE-042]] scratch. Do not move, review, verify, prove, close, or otherwise decide either downstream ticket. After merge, hand off CORE-101 itself for independent merged-main verification/proof and later closeout.

## Verification

- Before preparation: exact clean GitHub-origin `main`, DOC-024 Done, canonical board binding, version/notes, and branch/tag/PR/release absence checks.
- Preparation: one `npm run release -- 0.3.7 --ticket CORE-101` exit; generated PR footer/diff, hosted checks, independent review, and normal merge SHA.
- Publisher: one `npm run release -- 0.3.7 --publish --release-commit <full-normal-merge-sha>` exit from a separate clean merged-main clone with only process-scoped credential.
- Public: tag target, visible release, strict `verify-release-assets` exit 0 including `latest.yml`, and terminal successful tag `release-verify` workflow.
- Historical: demonstrate only read-only preservation of v0.3.4/v0.3.5/v0.3.6; record no mutation of their tags/releases/assets/workflows.

## Risks / open questions

- **DOC-024 may not be Done:** this is a hard hold, mitigated by no take or release action.
- **A release preflight or phase may fail:** capture its exit/output and stop; no outer retry, manual repair, retag, upload, release edit, or bypass is authorized.
- **Public asset mismatch or workflow failure:** retain strict FAIL/INCONCLUSIVE evidence and create a distinct remediation ticket if a source defect is proven; do not weaken validation or mutate v0.3.7 ad hoc.
- **Credential leakage:** bind only to the publisher process and redact/sanitize all evidence. No secret value is retained in ticket documents or logs.
