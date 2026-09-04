# Plan — CORE-137 v0.4.1 release and promotion

## Objective

Publish 0.4.1 from a `main` commit containing every HZN-008 merge through CORE-119 and GUI-150, verify it through the real release path, then install and pin it as the live control plane after the promotion acceptance below. 0.4.1 is a repair release: it ships no new feature, and its acceptance is the set of failures 0.4.0 caused on this machine and in the repositories Kanmer is installed into.

## Starting state

- Live server: packaged v0.4.0 (`get_status.server.version`), board format 3, board branch `kanmer-board`. In Claude Code every tool result renders as `{project}` (MCP-055 is merged, not installed); the workaround is the `KanmerBackups\tools\kt.mjs` shim.
- Merged and unreleased on `origin/main`: MCP-055 (#310), GUI-147 (#311), SKILL-039 (#312), GUI-149 (#313), CORE-139 (#314), MCP-056 (#315), CORE-133 (#316). In flight: GUI-150 (#317, Review), CORE-119 (Implementing). `package.json` and `apps/gui/release-notes.md` still say 0.4.0.
- Rollback installer retained: `C:\Users\Alex\Documents\KanmerBackups\installers\0.4.0\Kanmer-Setup-0.4.0.exe` (with blockmap, MCPB and `latest.yml`).
- The board-branch copy of `.github/workflows/board-regate.yml` was refreshed to the CORE-139 shape on 2026-09-04 (board commit `ccf8b459`); runs 33822727625 (board-regate) and 33822734941 (dispatch, `regate` only, `verify` skipped) are the evidence.
- No release-channel record exists on the live board yet; 0.4.0 rehearsed the channel on a copied board only.
- The source-root checkout carries untracked operator files (`info-pack/`); the release script refuses a dirty tree, so the release runs from a fresh clone, exactly as CORE-136 did.

## Governing docs

- FRD-021 auto-update: publish a coherent updater set (installer, blockmap, `latest.yml`, MCPB) and prove clients consume it.
- FRD-031 release channel: one live lease per channel; the attempt identity binds the exact integration SHA.
- FRD-035 / ADR-0021: stable controls candidate; promotion requires backup, acceptance and a rollback path before the candidate becomes the live authority.
- HZN-008 `context.md` "Review budget and root-cause rule": one review, one remediation, one delta.

## Cut point (all must be true before step 2)

- MCP-055, GUI-147, SKILL-039, GUI-149, CORE-139, MCP-056, CORE-133, GUI-150 and CORE-119 are Done with exact-SHA proofs (`kind: proof-record`, `result: PASS`, `merged_sha` an ancestor of the release base).
- Nothing in Implementing or Review; `get_status.counts.taken` is 0; `.worktrees/` holds only `kanmer`; no `CORE-*`/`GUI-*` implementation branches remain locally.
- Board pushed (`boardSync.ahead` 0); hosted `verify` green on the `push: main` run at the `origin/main` tip; fresh clone `npm run verify` exit 0 with the default temp folder.
- Deferral rule: GUI-150 or CORE-119 may drop out of 0.4.1 only if it is the last thing holding the cut for more than one working day; the deferral is recorded on the ticket and in `## 0.4.1` before step 3.

## Required changes (repository)

1. `apps/gui/release-notes.md`: new top section `## 0.4.1` grouped **Fixed / Skills and policy / Proof** (draft in this ticket's `scratch/release-notes-draft.md`; each bullet checked against the ticket's post-implementation report before it is committed).
2. Version manifests and generated artifacts written by `scripts/release.mjs`: `package.json`, `apps/gui/package.json`, `package-lock.json`, `plugins/kanmer/.claude-plugin/plugin.json`, `plugins/kanmer/.codex-plugin/plugin.json`, `plugins/kanmer/plugin.json`, `mcpb/manifest.json`, `plugins/kanmer/mcp/kanmer-mcp.cjs`.
3. Nothing else. No architecture change, no skill prose, no workflow edits.

## Do not modify

- `.worktrees/kanmer` or the `kanmer-board` branch from the release clone.
- The source-root checkout's untracked operator files.
- Any existing release tag or GitHub release; `KanmerBackups\installers\0.4.0`.
- Any in-flight ticket branch.

## Ordered steps

1. **Backup the live board.** From the source root: confirm `git -C .worktrees/kanmer status --porcelain` is empty and local `kanmer-board` == `origin/kanmer-board`; zip `.worktrees/kanmer` to `C:\Users\Alex\Documents\KanmerBackups\kanmer-board-<UTC stamp>.zip`; record path, SHA-256 and board commit in `scratch/promotion.md`.
2. **Acquire the live release channel.** `release_channel {"action":"acquire","channel":"main","integration_sha":"<origin/main tip, 40-hex>"}` through the installed server on the live board; record `lease_id`, `lease_revision` and the attempt id in `scratch/promotion.md`; renew it whenever a later step runs longer than the lease. If the channel is already held, stop: reconcile the holder before continuing (never `supersede` an operator lease from this ticket).
3. **Fresh release clone.** `git clone https://github.com/collisionengineers/kanmer.git C:\Users\Alex\Documents\GitHub\kanmer-release-0.4.1` at the cut-point `origin/main`; `npm ci`; record the HEAD SHA and confirm it equals the acquired integration SHA.
4. **Release notes.** In the clone, write the `## 0.4.1` section above `## 0.4.0`; commit on local `main` as `docs(release): add v0.4.1 notes` (rides inside the release PR; `main` is not pushed directly).
5. **Prepare.** In the clone: `npm run release -- 0.4.1 --ticket CORE-137`. The script runs the shared verify rail, bumps manifests on `release/v0.4.1`, rebuilds the bundle and MCPB, runs `plugin:check`, builds the GUI, commits `release: v0.4.1`, pushes only that branch and opens the PR with footer `Kanmer: CORE-137`. Record exit code and prepared commit.
6. **Board and review.** Move CORE-137 to Implementing then Review (post-implementation report = the script transcript summary plus the cut-point census); the GUI pushes the board; dispatch one fresh Opus reviewer running `kanmer-review` from `origin/main` (never a Fable subagent). The reviewer confirms the diff is exactly the notes commit plus script-generated version artifacts, writes the attestation at the exact PR head with the pushed `board_sha`, resolves every thread, and re-runs `kanmer-gate` after the board push if it ran early.
7. **Merge.** Squash-merge once `verify` and `kanmer-gate` are green at the exact head and `mergeStateStatus` is CLEAN. Move CORE-137 to Verifying. Record the merge SHA; `release_channel record` with `included_prs` (#310–#317 plus CORE-119's and the release PR) and `included_tickets`.
8. **Publish.** In the clone: `git switch main && git pull --ff-only`; export `GH_TOKEN=$(gh auth token)`; `npm run release -- 0.4.1 --publish --release-commit <full merge SHA>`. The script builds the GUI, creates and pushes `refs/tags/v0.4.1`, packages once with publishing disabled, uploads the canonical asset set to a draft, verifies digests, then publishes. Record every exit code. Copy the four assets to `KanmerBackups\installers\0.4.1`.
9. **Independent release verification.** `node scripts/verify-release-assets.mjs 0.4.1 --remote-coherent` (exit 0 required); wait for `.github/workflows/release.yml` `release-verify` on the tag to be green; `gh release view v0.4.1` shows non-draft, latest, four assets. `release_channel record` with `release_tag: v0.4.1`, `artifact_manifest`, `verification_state: passed`.
10. **Promotion acceptance** (each command and exit code in `scratch/promotion.md`, summarised in `proof/proof.md`):
    a. `npm run dist:check` output from step 8 retained; boot `apps/gui/release/win-unpacked/Kanmer.exe` with `KANMER_SMOKE=1 KANMER_OPEN=<copied board> --user-data-dir=<fresh dir>` (exit 0).
    b. Copy the board backup to a temp directory and run `npm run smoke:headless` against it with the standalone 0.4.1 bundle.
    c. Install `Kanmer-Setup-0.4.1.exe` over 0.4.0 (real two-version updater path). Capture the installer/updater log lines and the installed launcher probe.
    d. Through the installed launcher against the **copied** board: `get_status` (0.4.1, same fingerprint, format 3), `create_item`, `take_ticket` acquire/renew/release, backward `move_item` with reason, `reconcile_ticket` dry-run, `list_projects`.
    e. **MCP-055 acceptance:** a fresh Claude Code session against the live board prints the full `get_status` payload (not only `{project}`) without the shim.
    f. **GUI-147 / GUI-150 acceptance:** Settings → Connect (Claude) succeeds; `claude plugin list --json` reports `kanmer@kanmer` at 0.4.1 with `enabled: true` and no `errors`; then point the staged marketplace at a deleted directory and Connect again → `ok: false` quoting the host's error and the uninstall+install repair, Settings shows the load error; run the repair and confirm both clear.
    g. **GUI-149 acceptance:** in a scratch git repository, Connect three times for Claude Code, OpenCode and Codex; `git status --porcelain` shows only `.gitignore` after the first Connect and nothing new after the second and third; the written registrations carry the stable launcher, not absolute machine paths; a legacy absolute `.mcp.json` copied in is reported by `get_status.repo` as `behind`.
    h. **CORE-139 acceptance:** already evidenced on 2026-09-04 (board-regate run 33822727625; dispatch 33822734941 ran only `regate`); cite it, and confirm `node --test scripts/pr-workflow.test.mjs` exit 0 at the release SHA.
    i. **MCP-056 acceptance:** `packages/mcp-server` `http.test.mjs` "project resolution fails before binding" passes at the release SHA with the default temp folder while `~/.kanmer/endpoints.json` exists (covered by the fresh-clone rail in the cut point; cite the log line).
    j. **CORE-119 acceptance:** `npm run golden` and `npm run golden:promotion` exit 0 at the release SHA against the installed 0.4.1 launcher (exact commands from CORE-119's proof).
    k. **Setup acceptance:** `kanmer-setup` in the source root → `get_status.repo.upToDate === true` and `npm run verify:agents-block` exit 0; `kanmer-setup` in `C:\Users\Alex\Documents\GitHub\pegasus` → `repo.upToDate === true`, one managed AGENTS block, skills stamp 0.4.1, portable `.mcp.json`; Pegasus's `documentation` CI job stays green on the refreshed skill copies.
    l. **Rollback rehearsal:** reinstall `KanmerBackups\installers\0.4.0\Kanmer-Setup-0.4.0.exe`; `get_status` shows 0.4.0 serving the live board unchanged (board untouched, `project.json` intact); reinstall 0.4.1.
    m. **Live cut-over:** stop the 0.4.0 runtime cleanly (quit GUI, stop MCP sessions), confirm 0.4.1 installed, restart this MCP session, `get_status` on the live board reports 0.4.1 with the same fingerprint.
11. **Channel, proof and closeout.** `release_channel complete` on the live lease. Write `proof/proof.md` (PASS only if 9 and 10a–10m all passed), move Verifying → Done. Record in HZN-008 `context.md` that 0.4.1 closes the horizon; write the run ledger entry. Remove the release clone. Delete the `KanmerBackups\tools\kt.mjs` workaround note from the operator memory only after 10e passes.

## Acceptance checks

- v0.4.1 tag and release point at a `main` commit containing CORE-119's and GUI-150's merges (`git merge-base --is-ancestor`).
- Full verify rail exit 0 in the prepare phase; `plugin:check` exit 0 at the new version; packaged server identifies as 0.4.1.
- Installer, blockmap, MCPB and `latest.yml` exist with non-zero sizes; remote SHA-256 digests equal local artifacts; `release-verify` green.
- Promotion acceptance 10a–10m recorded with exit codes; rollback rehearsal shows 0.4.0 serving the untouched live board.
- Live `get_status.server.version` is 0.4.1 with the same project fingerprint and board branch; the live release channel for `main` holds one completed attempt for v0.4.1 and no live lease.

## Commands

- `release_channel {"action":"acquire","channel":"main","integration_sha":"<sha>"}` / `record` / `complete` (through the installed server, live board)
- `npm run release -- 0.4.1 --ticket CORE-137`
- `npm run release -- 0.4.1 --publish --release-commit <full-sha>`
- `node scripts/verify-release-assets.mjs 0.4.1 --remote-coherent`
- `gh release view v0.4.1 --json tagName,isDraft,publishedAt,assets,url`
- `git merge-base --is-ancestor <CORE-119 merge sha> <release sha>`; same for GUI-150
- `npm run smoke:headless`, packaged `KANMER_SMOKE` boot, installed launcher probe, `npm run golden`, `npm run golden:promotion`, `node --test scripts/pr-workflow.test.mjs`, `npm run verify:agents-block`, `claude plugin list --json`

## Failure and deviation rules

Stop before publishing if the prepare rail fails, the release PR is not independently attested at its exact head, required checks are red, the release channel cannot be acquired, or credentials are unavailable. If publication partially succeeds, preserve the immutable attempt (`release_channel fail` with the reason) and never repair by hand. If promotion acceptance 10c–10k fails, do **not** cut over: roll back to 0.4.0 (10l), `release_channel fail`, record the failure class in the proof, and route the defect to a new implementation ticket; the release stays published but is not the live control plane. Any flake in the Windows rail is discharged per the HZN-008 rule (re-run at the same SHA, prove the diff cannot reach the test, retain both attempts). A base failure already red on `main` at the release base is recorded as `existing-base-failure` with the run id and does not block, but the proof names it.

## Stop condition

Stop only after v0.4.1 is published and externally verified, the promotion acceptance is recorded, the live board is served by 0.4.1 with an evidenced rollback path, the live release channel shows the attempt completed, HZN-008 records its closure, and the release clone is removed.
