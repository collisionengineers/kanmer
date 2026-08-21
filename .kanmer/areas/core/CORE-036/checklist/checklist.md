# Checklist — CORE-036

## Workflow contract

- [x] Add `.github/workflows/release.yml`.
- [x] Trigger only on pushed tags matching `v*`.
- [x] Define one stable `release-verify` job/check name.
- [x] Set `runs-on: windows-latest`.
- [x] Set `defaults.run.shell: bash`.
- [x] Set a finite job timeout.
- [x] Set `permissions: contents: read` and no write permission.
- [x] Add tag-scoped concurrency with `cancel-in-progress: false`.

## Tagged source and versions

- [x] Check out the pushed tag rather than mutable `main`.
- [x] Configure Node 20 and npm cache.
- [x] Run `npm ci`.
- [x] Validate `GITHUB_REF_NAME` as `v<semver>`.
- [x] Derive `VERSION` by stripping the leading `v` once.
- [x] Assert root `package.json` version equals `VERSION`.
- [x] Assert `apps/gui/package.json` version equals `VERSION`.
- [x] Assert the Claude plugin manifest version equals `VERSION`.
- [x] Assert the Codex plugin manifest version equals `VERSION`.
- [x] Fail before packaging with all mismatched paths listed.

## Existing rails

- [x] Confirm CORE-031's `npm run verify` exists; stop if absent.
- [x] Run `npm run verify` exactly once without `continue-on-error`.
- [x] Run `npm run dist:check` exactly once without `continue-on-error`.
- [x] Confirm the local release directory contains the tagged installer, blockmap and `latest.yml`.

## Published-asset proof

- [x] Pass the read-only GitHub job token only to the verifier step.
- [x] Invoke `scripts/verify-release-assets.mjs` with the validated version.
- [x] Add a finite polling loop around only the external verifier.
- [x] Treat exit 0 as success and record the attempt count.
- [x] Treat exit 2 as an immediate execution failure.
- [x] Retry exit 1 only until the fixed deadline.
- [x] On final exit 1, emit the verifier's definitive asset report and fail.
- [x] Confirm the workflow contains no publish, repair, edit or demotion command.
- [x] Write a secret-free job summary with tag, version, attempts and outcome.

## Repository contract

- [x] Update the no-CI/future-tense release section in `AGENTS.md`.
- [x] Record the workflow path and exact stable job/check name.
- [x] Record that `release.mjs` publishes and Actions validates read-only.
- [x] Preserve existing verifier exit-code and integrity guidance without duplicating YAML.
- [x] Run `git diff --check`.

## Verification

- [x] Run the repository's script tests.
- [x] Run `npm run verify` on the implementation branch.
- [x] Run `npm run dist:check` on the implementation branch.
- [ ] Push the next real version tag and capture a green `release-verify` run tied to its SHA.
- [ ] In a disposable fork/test repository, create an incomplete draft release for a temporary tag.
- [ ] Capture the expected red workflow result and missing/mismatched asset detail.
- [ ] Delete the disposable release and tag and record cleanup.
- [ ] Confirm CI never published or changed either release.
- [ ] Prepare proof with command logs, GitHub run references and exact tag SHAs.

## Stop condition

- [ ] Stop with the PR ready for independent review; do not merge, publish/repair a release, or begin another ticket.

## Progress notes

Append implementation notes here; do not rewrite the plan during execution.

## Paused / resume point — 2026-08-20

- No source files were changed.
- Blocker: current `origin/main` at `71e3a05` has no root `npm run verify` script and no `VERIFY_STEPS`; direct `npm run verify` reports `Missing script: "verify"`.
- This ticket's plan/checklist require CORE-031's canonical verify rail and explicitly prohibit substituting an inlined list.
- Resume after CORE-031 lands on main: update this worktree from `origin/main`, confirm `npm run verify` exists, then implement the workflow from the approved plan.
- Retained resume point: branch `core-036-tag-push-release-verification`, worktree `.worktrees/core-036`.


---

## Progress — 2026-08-21

- Implemented the single read-only Windows tag workflow in .github/workflows/release.yml and updated AGENTS.md to name the stable release-verify check and publisher/validator split.
- Local evidence: git diff --check passed; npm run verify completed the shared build/test/smoke/skills/agents/plugin rails on this branch; npm run dist:check completed the Windows packaging/update-package rail.
- The workflow contract, version guards, permissions, bounded exit-class polling, and no-publish/no-repair behavior were reviewed against the plan. Real GitHub tag-trigger green proof and the disposable incomplete-release red proof are external-environment evidence and remain explicitly unclaimed until a real run is authorized/available.
