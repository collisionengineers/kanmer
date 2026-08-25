# Plan

## Objective

Publish v0.3.11 as the consolidated Windows release from the current protected `main`, including the merged remote ChatGPT connector and setup fixes, and prove the public updater artifacts are complete and byte-identical. Do not install or update the user's GUI.

## Starting state

- `origin/main` is version 0.3.10 at or beyond merge `645694f651561f5ad3bf0fc44ae88bee054fe8de`.
- GUI-141 and MCP-051 are merged and await proof against the next installed Windows release.
- The root checkout contains unrelated user changes and must not be used for release edits.
- The protected-main release script prepares a release PR, then publishes only from the merged release commit on `main`.

## Governing docs

- `docs/functional/frd/FRD-025-remote-access.md`: release the already-merged Windows remote-access implementation without changing its contract.
- `docs/functional/frd/FRD-021-auto-update.md`: publish the installer, blockmap, and `latest.yml` as a coherent updater set and verify public visibility and integrity.

## Required changes

- Create the release worktree and branch from current `origin/main` through `take_ticket`.
- Replace the top release-notes section with accurate v0.3.11 notes covering the remote ChatGPT connector, Windows-native setup/runtime path, and relevant setup reconciliation fixes already merged.
- Run the release preparation command with ticket `CORE-110`; allow it to bump all version manifests and deterministic plugin/MCPB artifacts, run the full verification rail, commit, push, and open the release PR.
- Confirm required hosted CI and review; merge the release PR through the protected-main path.
- From a clean detached/exact-main release checkout, run publish mode with the full merged release commit SHA.
- Verify the immutable tag, latest release visibility, Windows installer, blockmap, `latest.yml`, MCPB asset, sizes, and SHA-256 digests.
- Record proof and traceability. Leave installed-GUI update and live post-install checks to the user.

## Expected files

- `apps/gui/release-notes.md`
- `apps/gui/package.json`
- `package.json`
- `package-lock.json`
- `plugins/kanmer/.claude-plugin/plugin.json`
- `plugins/kanmer/.codex-plugin/plugin.json`
- `mcpb/manifest.json`
- `plugins/kanmer/mcp/kanmer-mcp.cjs`

## Do not modify

- Product implementation beyond release-generated artifacts and notes.
- CI workflows or add any Linux/Ubuntu lane.
- The user's installed GUI or its settings.
- Unrelated dirty files in the root checkout.

## Constraints

- Use only the Windows release path.
- Never overwrite an existing release branch, tag, or GitHub release.
- Preserve any failed publication as evidence and move to a higher version if immutable release state has already been created.
- The release commit must be reviewed and merged before tag or asset publication.

## Ordered steps

1. Take CORE-110 and create its isolated worktree from current `origin/main`.
2. Update v0.3.11 release notes to describe only merged behavior.
3. Run `npm run release -- 0.3.11 --ticket CORE-110` to execute verification and prepare the release PR.
4. Inspect the generated commit and PR; wait for required checks and obtain independent review.
5. Merge the approved release PR and resolve the exact full merge/release commit on `main`.
6. Create a clean checkout at updated `main`, supply a release-capable GitHub token without recording it, and run `npm run release -- 0.3.11 --publish --release-commit <full-sha>`.
7. Re-run `node scripts/verify-release-assets.mjs 0.3.11` and independently inspect the GitHub release metadata.
8. Record all commands, exit codes, artifact results, tag, PR, and commit in proof; stop before GUI installation.

## Acceptance checks

- Full local verification exits 0 before the release PR is created.
- Required hosted PR checks pass and review is approved.
- Release commit is reachable from `origin/main` before publication.
- `v0.3.11` is immutable and points at the approved merged release commit.
- `/releases/latest` reports `v0.3.11`.
- Installer, blockmap, `latest.yml`, and MCPB are present, uploaded, and match local sizes/digests.
- No Ubuntu artifact or workflow is introduced.
- The installed GUI remains untouched.

## Commands

- `npm run release -- 0.3.11 --ticket CORE-110`
- `gh pr checks <release-pr> --watch`
- `npm run release -- 0.3.11 --publish --release-commit <full-sha>`
- `node scripts/verify-release-assets.mjs 0.3.11`

## Failure and deviation rules

- Stop on any non-zero verification or CI result; do not weaken checks.
- Do not repair unrelated failures in this release ticket; file or link a separate ticket.
- Do not reuse or move an existing tag/release.
- If publication creates immutable failed state, retain it and use a successor version only after recording the failure.

## Stop condition

Stop when v0.3.11 is publicly visible and every expected Windows/update asset is independently verified, the ticket contains final release proof and traceability, and the user has been given the installer/update handoff. Do not install or launch the updated GUI.
