# Plan — CORE-136 v0.4.0 release and promotion

## Objective

Publish 0.4.0 from a `main` commit containing every HZN-008 merge through CORE-127 (or through CORE-126 if CORE-127 freezes under the bounded-round rule), verify it through the real release path, then install and pin it as the live control plane after the minimal promotion acceptance the operator approved on 2026-09-01.

## Starting state

- Live server: packaged v0.3.12 (`get_status.server.version`), project fingerprint `kanmer-proj-v1:5dbaab312733032858ad528e48eeaa4221b4356f9b7899d892540d964c10b268`, board format 3, board branch `kanmer-board`.
- `origin/main` at or after `4fda54b4` with 21 unreleased commits; `package.json` and `apps/gui/release-notes.md` still say 0.3.12.
- CORE-127 / PR #307 is in its one bounded remediation round. This ticket waits for its merge or freeze before step 3.
- The source-root checkout carries untracked operator files (`goal.md`, `.infisical.json`, `skills-lock.json`); the release script refuses a dirty tree, so the release runs from a fresh clone, exactly as CORE-111 did.

## Governing docs

- FRD-021 auto-update: the release must publish a coherent updater set (installer, blockmap, `latest.yml`, MCPB) and prove clients can consume it.
- FRD-035 / ADR-0021: stable controls candidate; promotion requires backup, acceptance and a rollback path before the candidate becomes the live authority.
- HZN-008 `context.md` "Review budget and root-cause rule": one review, one remediation, one delta.

## Required changes (repository)

1. `apps/gui/release-notes.md`: new top section `## 0.4.0` (draft retained in this ticket's `scratch/release-notes-draft.md`), with the CORE-127 paragraph added only if PR #307 merged.
2. Version manifests and generated artifacts written by `scripts/release.mjs`: `package.json`, `apps/gui/package.json`, `package-lock.json`, `plugins/kanmer/.claude-plugin/plugin.json`, `plugins/kanmer/.codex-plugin/plugin.json`, `plugins/kanmer/plugin.json`, `mcpb/manifest.json`, `plugins/kanmer/mcp/kanmer-mcp.cjs`.
3. Nothing else. No architecture change, no skill prose, no gitignore edits (those belong to SKILL-039).

## Do not modify

- `.worktrees/kanmer` or the `kanmer-board` branch from the release clone.
- The source-root checkout's untracked operator files.
- Any existing release tag or GitHub release.
- CORE-127's branch or PR.

## Ordered steps

1. **Backup the live board.** From the source root: confirm `git -C .worktrees/kanmer status --porcelain` is empty and local `kanmer-board` == `origin/kanmer-board`; zip `.worktrees/kanmer` to `C:\Users\Alex\Documents\KanmerBackups\kanmer-board-<UTC stamp>.zip`; record path, SHA-256 and board commit in `scratch/promotion.md`.
2. **Fresh release clone.** `git clone https://github.com/collisionengineers/kanmer.git C:\Users\Alex\Documents\GitHub\kanmer-release-0.4.0` at the post-CORE-127 `origin/main`; `npm ci`; record the HEAD SHA.
3. **Release notes.** In the clone, write the `## 0.4.0` section above the `## 0.3.12` section; commit on local `main` as `docs(release): add v0.4.0 notes` (this commit rides inside the release PR; `main` is not pushed directly).
4. **Prepare.** In the clone: `npm run release -- 0.4.0 --ticket CORE-136`. The script runs the shared verify rail, bumps manifests on `release/v0.4.0`, rebuilds the bundle and MCPB, runs `plugin:check`, builds the GUI, commits `release: v0.4.0`, pushes only that branch and opens the PR with footer `Kanmer: CORE-136`. Record exit code and prepared commit.
5. **Board and review.** Move CORE-136 to Implementing then Review (post-implementation report = the script transcript summary); commit and push the board; dispatch one fresh Opus reviewer with the kanmer-review skill from `origin/main`. The reviewer confirms the diff is exactly the notes commit plus script-generated version artifacts, writes the attestation at the exact PR head with the pushed `board_sha`, and resolves any threads. Re-run `kanmer-gate` after the board push if it ran early.
6. **Merge.** Squash-merge once `verify` and `kanmer-gate` are green and mergeStateStatus is CLEAN. Move CORE-136 to Verifying. Record the merge SHA.
7. **Publish.** In the clone: `git switch main && git pull --ff-only`; export `GH_TOKEN=$(gh auth token)`; `npm run release -- 0.4.0 --publish --release-commit <full merge SHA>`. The script builds the GUI, creates and pushes `refs/tags/v0.4.0`, packages once with publishing disabled, uploads the canonical asset set to a draft, verifies digests, then publishes. Record every exit code.
8. **Independent release verification.** `node scripts/verify-release-assets.mjs 0.4.0 --remote-coherent` (exit 0 required); wait for `.github/workflows/release.yml` `release-verify` on the tag to be green; `gh release view v0.4.0` shows non-draft, latest, four assets.
9. **Promotion acceptance** (record each command and exit code in `scratch/promotion.md`, then summarise in `proof/proof.md`):
   a. `npm run dist:check` output from step 7 retained; boot `apps/gui/release/win-unpacked/Kanmer.exe` with `KANMER_SMOKE=1 KANMER_OPEN=<copied board> --user-data-dir=<fresh dir>` (exit 0).
   b. Copy the board backup to a temp directory and run `npm run smoke:headless` against it with the standalone 0.4.0 bundle.
   c. Install `Kanmer-Setup-0.4.0.exe` over 0.3.12 (real two-version updater path). Capture the installer/updater log lines and the installed launcher probe. This is the evidence CORE-042 and CORE-036 cite.
   d. Through the installed launcher against the **copied** board: `get_status` (0.4.0, same fingerprint, format 3, `project.json` present), `create_item`, `take_ticket` acquire/renew/release, backward `move_item` with reason and confirm `review_round` increments, `reconcile_ticket` dry-run on the copied CORE-109 shape, `release_channel` acquire/complete, `list_projects`.
   e. Rollback rehearsal: reinstall the retained `Kanmer-Setup-0.3.12.exe`, `get_status` shows 0.3.12 serving the live board unchanged, then reinstall 0.4.0.
   f. Live cut-over: stop the 0.3.12 runtime cleanly (quit GUI, stop MCP sessions), confirm 0.4.0 installed, restart this MCP session, `get_status` on the live board reports 0.4.0 and the same fingerprint; run `kanmer-setup` in the source root and `npm run verify:agents-block`.
10. **Proof and closeout.** Write `proof/proof.md` (PASS only if 8 and 9a–9f all passed), move Verifying → Done, then write PASS attempts on CORE-036 (tag-push `release-verify` run) and CORE-042 (protected-main release PR + publish + two-version updater) citing this ticket, move both to Done; attempt GUI-141's packaged runtime-alias check and record the result truthfully. Remove the release clone. Append the run ledger.

## Acceptance checks

- v0.4.0 tag and release point at a `main` commit containing CORE-126's merge (and CORE-127's when merged).
- Full verify rail exit 0 in the prepare phase; `plugin:check` exit 0 at the new version; packaged server identifies as 0.4.0.
- Installer, blockmap, MCPB and `latest.yml` exist with non-zero sizes; remote SHA-256 digests equal local artifacts; `release-verify` green.
- Promotion acceptance 9a–9f recorded with exit codes; rollback rehearsal shows 0.3.12 serving the untouched live board.
- Live `get_status.server.version` is 0.4.0 with the same project fingerprint and board branch.

## Commands

- `npm run release -- 0.4.0 --ticket CORE-136`
- `npm run release -- 0.4.0 --publish --release-commit <full-sha>`
- `node scripts/verify-release-assets.mjs 0.4.0 --remote-coherent`
- `gh release view v0.4.0 --json tagName,isDraft,publishedAt,assets,url`
- `git merge-base --is-ancestor <CORE-126/127 merge sha> <release sha>`
- `npm run smoke:headless`, packaged `KANMER_SMOKE` boot, installed launcher probe.

## Failure and deviation rules

Stop before publishing if the prepare rail fails, the release PR is not independently attested at its exact head, required checks are red, or credentials are unavailable. If publication partially succeeds, preserve the immutable attempt and never repair by hand. If promotion acceptance 9c–9d fails, do **not** cut over: roll back to 0.3.12 (9e), record the failure class in the proof, and route the defect to a new implementation ticket; the release stays published but is not the live control plane. Any flake in the Windows rail is discharged per the HZN-008 rule (re-run at the same SHA, prove the diff cannot reach the test, retain both attempts).

## Stop condition

Stop only after v0.4.0 is published and externally verified, the promotion acceptance is recorded, the live board is served by 0.4.0 with an evidenced rollback path, CORE-036/CORE-042 reflect the evidence, and the release clone is removed.
