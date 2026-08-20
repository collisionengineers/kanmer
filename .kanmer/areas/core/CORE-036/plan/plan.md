# Plan — CORE-036: Tag-push release verification workflow

## Objective

Add one stable GitHub Actions job that independently proves a pushed Kanmer release tag was built from a fully verified commit and that the corresponding public release contains byte-matching updater assets. CI validates only; the local `release.mjs` process remains the publisher and repair mechanism.

## Starting state

- Release creation and verification are performed from one machine by `scripts/release.mjs`.
- The repository has no tag-push release workflow.
- `verify-release-assets.mjs` already supplies the correct external integrity check and meaningful exit codes.
- `dist:check` already produces and validates the Windows package locally.
- CORE-031 is expected to add the canonical `npm run verify` command. This ticket must not invent a temporary replacement.

## Approach

Use a single `windows-latest` job triggered by version tags. The job validates the tag against committed package/plugin versions, runs the two existing authoritative commands, then polls the existing release verifier until the publisher has finished or a bounded deadline expires. This beats reproducing the release script in Actions because it preserves one publisher, one verification pyramid and one asset verifier while still obtaining an independent environment and GitHub-enforced exit status.

## Governing docs

- **MASTERPLAN.md §6.3 S-20 — Meets.** The workflow is tag-push only, runs `npm ci`, `npm run verify`, `npm run dist:check`, and validates published assets. It does not publish.
- **MASTERPLAN.md Appendix A — Meets.** `verify` is reused rather than restated; Windows shell behavior is made explicit; the external verifier's exit classes remain visible.
- **AGENTS.md release rules — Modifies current operational truth.** Replace the “no CI / real fix” wording with the landed workflow contract and stable check name. Do not alter unrelated contributor guidance.
- **No linked PRD/FRD/ADR.** This is an operational rail over existing release behavior, not a new product behavior or architectural decision.

## Required changes

### 1. Create the workflow skeleton

1. Add `.github/workflows/release.yml` with a human-readable workflow name such as `Release verification`.
2. Trigger only on `push.tags: ["v*"]`.
3. Define one job with the stable id/name `release-verify` / `release-verify`; do not create separate build and asset jobs whose artifacts or names can drift.
4. Set `runs-on: windows-latest`, `timeout-minutes` to a finite value sufficient for Electron packaging and polling, and `defaults.run.shell: bash`.
5. Set top-level or job permissions to `contents: read` only.
6. Add `concurrency` keyed by repository plus tag, with `cancel-in-progress: false`; a second event for the same release must not cancel an integrity check already in progress.

### 2. Establish the tagged source deterministically

7. Check out the pushed tag with full enough history for build/version scripts; do not check out `main` separately.
8. Install Node 20 using the standard setup action with npm cache keyed from `package-lock.json`.
9. Run `npm ci`; never use `npm install` in CI.
10. Derive `VERSION` from `GITHUB_REF_NAME` by requiring a strict `v<semver>` form and removing the leading `v`.
11. Read and compare the versions in:
    - root `package.json`;
    - `apps/gui/package.json`;
    - `plugins/kanmer/.claude-plugin/plugin.json`;
    - `plugins/kanmer/.codex-plugin/plugin.json`.
12. Fail before build if any value differs from `VERSION`, naming every mismatched file.
13. Export only the validated value through `GITHUB_ENV` or a step output; do not parse a version from release assets later.

### 3. Run the existing quality rails

14. Run `npm run verify` as one step. If the script does not exist, treat that as the unmet CORE-031 prerequisite; do not substitute a list of commands.
15. Run `npm run dist:check` as one step. This must produce `apps/gui/release/` locally and validate the packaged updater layout.
16. Preserve command exit codes and unabridged logs. Do not add `continue-on-error`, retry `verify`, or retry `dist:check`.

### 4. Validate the published release externally

17. Expose `${{ github.token }}` to the verifier step as `GH_TOKEN` (or the exact environment name already recognized by the script); do not echo it.
18. Invoke `node scripts/verify-release-assets.mjs "$VERSION"` against the current repository and the default local output directory.
19. Wrap only this read-only call in a bounded polling loop because the tag event can precede completion of the laptop publisher.
20. On exit `0`, finish successfully and record the attempt count.
21. On exit `2`, stop immediately and fail as “verification could not run”; polling cannot repair API/auth/schema failure.
22. On exit `1`, sleep for a fixed interval and retry until the deadline. After the final attempt, rerun once without output suppression so the definitive missing/mismatched asset report is visible, then fail.
23. Never call `gh release`, `electron-builder --publish`, `npm run release`, or any repair/edit API from the workflow.
24. Add a concise job summary containing tag, validated version, local artifact directory, verification attempt count and final outcome; include no secrets or full hashes unless already public.

### 5. Update the repository contract

25. Update `AGENTS.md` where it currently says releases have no CI:
    - name `.github/workflows/release.yml`;
    - state that `release.mjs` publishes and the workflow validates;
    - record the stable job/check name;
    - state the trigger and read-only permissions;
    - preserve the existing asset-integrity and exit-code guidance.
26. Do not duplicate the full YAML or command pyramid in prose.
27. Run `git diff --check` and confirm no generated documentation file was hand-edited.

### 6. Prove positive and negative behavior

28. Run local YAML/syntax inspection available without adding dependencies; the real GitHub run remains authoritative for trigger/action semantics.
29. Confirm existing script tests, `npm run verify`, and `npm run dist:check` pass on the implementation branch.
30. On the next real Kanmer version tag, capture the Actions URL, tag SHA and green `release-verify` job output as proof.
31. In a disposable fork or test repository, create a temporary version tag and an intentionally incomplete draft release (for example omit `latest.yml`), run the same workflow, and capture the expected red asset-verification result.
32. Delete the temporary release and tag after recording the command log; record cleanup in proof.

## Expected files

Add:
- `.github/workflows/release.yml`

Modify:
- `AGENTS.md`

Read but do not normally modify:
- `package.json`
- `apps/gui/package.json`
- `plugins/kanmer/.claude-plugin/plugin.json`
- `plugins/kanmer/.codex-plugin/plugin.json`
- `scripts/release.mjs`
- `scripts/verify-release-assets.mjs`
- `scripts/verify-release-assets.test.mjs`
- `scripts/check-updater-package.mjs`
- `apps/gui/electron-builder.yml`

## Do not modify

- Release publishing, retry-repair or release-note behavior.
- GUI-092 or GUI-093 implementation scope.
- Asset names, updater feed format, installer target or signing policy.
- The shared `VERIFY_STEPS` list outside CORE-031.
- Branch protection or PR checks.

## Acceptance checks

- A `v<semver>` tag starts exactly one Windows release-verification job.
- The job is read-only with respect to repository/releases.
- A tag/package/plugin version mismatch fails before packaging.
- `npm run verify` and `npm run dist:check` are called directly and exactly once.
- The published release is checked with the existing verifier against artifacts built from the tagged commit.
- Exit 2 is not misreported as an incomplete release; exit 1 is not misreported as an execution failure.
- Publisher timing is handled by finite read-only polling, never by CI repair.
- The next complete release produces a green job.
- An intentionally incomplete disposable release produces a red job and clear missing-asset detail.
- `AGENTS.md` accurately records the current publisher/validator split and stable check name.

## Verification commands

```bash
npm ci
npm run verify
npm run dist:check
node scripts/verify-release-assets.mjs <version>
git diff --check
git status --short
```

GitHub proof:

```text
push v<version> → release-verify green
push disposable test tag with incomplete draft release → release-verify red
```

## Failure and deviation rules

- If CORE-031 has not provided `npm run verify`, stop; do not inline or invent its steps.
- If packaging cannot run on the chosen Windows runner, report the concrete blocker; do not switch the authoritative job to Linux.
- If the verifier needs a new CLI option, keep the change minimal and add unit coverage; do not duplicate its logic in YAML.
- If the tag workflow would need write permission to succeed, the design has drifted into publishing and must stop for replanning.
- If polling exceeds the deadline, fail and leave the release untouched.
- Do not merge, publish a release, or begin GUI-099 from this ticket.

## Stop condition

Stop when the workflow and AGENTS contract are committed, all local rails pass, the workflow has one recorded green run on a real tag and one recorded red run against an intentionally incomplete disposable release, and the PR is ready for independent review. Do not publish or repair releases from CI, merge the PR, or start another ticket.
