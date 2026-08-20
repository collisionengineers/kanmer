# Checklist — CORE-036

## Workflow contract

- [ ] Add `.github/workflows/release.yml`.
- [ ] Trigger only on pushed tags matching `v*`.
- [ ] Define one stable `release-verify` job/check name.
- [ ] Set `runs-on: windows-latest`.
- [ ] Set `defaults.run.shell: bash`.
- [ ] Set a finite job timeout.
- [ ] Set `permissions: contents: read` and no write permission.
- [ ] Add tag-scoped concurrency with `cancel-in-progress: false`.

## Tagged source and versions

- [ ] Check out the pushed tag rather than mutable `main`.
- [ ] Configure Node 20 and npm cache.
- [ ] Run `npm ci`.
- [ ] Validate `GITHUB_REF_NAME` as `v<semver>`.
- [ ] Derive `VERSION` by stripping the leading `v` once.
- [ ] Assert root `package.json` version equals `VERSION`.
- [ ] Assert `apps/gui/package.json` version equals `VERSION`.
- [ ] Assert the Claude plugin manifest version equals `VERSION`.
- [ ] Assert the Codex plugin manifest version equals `VERSION`.
- [ ] Fail before packaging with all mismatched paths listed.

## Existing rails

- [ ] Confirm CORE-031's `npm run verify` exists; stop if absent.
- [ ] Run `npm run verify` exactly once without `continue-on-error`.
- [ ] Run `npm run dist:check` exactly once without `continue-on-error`.
- [ ] Confirm the local release directory contains the tagged installer, blockmap and `latest.yml`.

## Published-asset proof

- [ ] Pass the read-only GitHub job token only to the verifier step.
- [ ] Invoke `scripts/verify-release-assets.mjs` with the validated version.
- [ ] Add a finite polling loop around only the external verifier.
- [ ] Treat exit 0 as success and record the attempt count.
- [ ] Treat exit 2 as an immediate execution failure.
- [ ] Retry exit 1 only until the fixed deadline.
- [ ] On final exit 1, emit the verifier's definitive asset report and fail.
- [ ] Confirm the workflow contains no publish, repair, edit or demotion command.
- [ ] Write a secret-free job summary with tag, version, attempts and outcome.

## Repository contract

- [ ] Update the no-CI/future-tense release section in `AGENTS.md`.
- [ ] Record the workflow path and exact stable job/check name.
- [ ] Record that `release.mjs` publishes and Actions validates read-only.
- [ ] Preserve existing verifier exit-code and integrity guidance without duplicating YAML.
- [ ] Run `git diff --check`.

## Verification

- [ ] Run the repository's script tests.
- [ ] Run `npm run verify` on the implementation branch.
- [ ] Run `npm run dist:check` on the implementation branch.
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
