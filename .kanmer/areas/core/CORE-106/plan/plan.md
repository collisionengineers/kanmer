# Plan

## Objective
Make release publication use one authoritative Windows package generation and retain strict independent verification without comparing separately signed installer builds byte-for-byte.

## Starting state
The v0.3.8 tag points at the intended merge, but Electron Builder publication raced release creation and uploaded only the installer. The tag workflow rebuilt a different signed installer and rejected its SHA mismatch. v0.3.8 remains immutable failed evidence. GUI-132, GUI-133, and MCP-049 fixes are already merged and await a clean successor release.

## Governing docs
`docs/functional/frd/FRD-021-auto-update.md` requires an update feed whose manifest and installer are coherent and an installed update path that works. This plan preserves and strengthens that contract: one package generation creates the manifest and installer, and both local and remote checks bind the published installer back to the manifest. No governing-document change is needed.

## Required changes
1. Package with Electron Builder publication disabled, then run the existing packaged-updater and local artifact coherence checks on that exact output.
2. Explicitly create the GitHub Release for the already-pushed immutable tag and upload exactly the installer, blockmap, latest.yml, and MCPB from the single package generation. Treat any existing release or missing local member as a refusal; do not silently clobber unrelated bytes.
3. Extend public verification with a remote-coherence mode that derives the expected asset names from the release version, detects missing/duplicate/non-uploaded assets, downloads latest.yml and the installer, and verifies manifest version, installer URL, size, and SHA-512. Check GitHub SHA-256 metadata when supplied.
4. Change the tag workflow to use remote-coherence mode. Keep `npm run verify` and `npm run dist:check` as independent source/package health checks, but do not compare their signed installer bytes to the publisher build.
5. Add deterministic unit tests for valid remote sets and each failure class, plus publisher command/ordering regression coverage without network side effects.
6. Update contributor release guidance and CLOSEOUT_PLAN.md to name v0.3.8 as failed evidence and v0.3.9/CORE-107 as the recovery sequence.

## Expected files
`scripts/release.mjs`, `scripts/verify-release-assets.mjs`, their tests and helpers as needed, `.github/workflows/release.yml`, `AGENTS.md`, and `CLOSEOUT_PLAN.md`.

## Do not modify
Runtime updater behavior, Codex launcher behavior, remote-access runtime code, dependency versions, existing tags/releases/assets, branch protection, or assertion strength.

## Constraints
No new dependency. No retag or repair of v0.3.8. No second package generation in the publisher. No token or credential in code/logs. Errors surface with non-zero exit codes. Public verification must fail closed when the manifest or installer cannot be retrieved or parsed.

## Ordered steps
1. Create the ticket worktree from current `origin/main`.
2. Refactor verification into pure public asset-shape/manifest checks plus bounded fetch orchestration.
3. Add failing fixtures/tests, then implement remote-coherence CLI mode.
4. Replace Electron Builder publication with package-never, explicit release creation, exact upload, and local-to-remote digest verification.
5. Update the tag workflow and contributor/closeout guidance.
6. Run targeted script tests, full `npm run test:scripts`, `npm run verify`, and a dry-run release path that performs no remote writes.
7. Record the implementation report and open a protected-main PR.

## Acceptance checks
- Pure tests reject missing, duplicate, non-uploaded, wrong-version, wrong-URL, wrong-size, wrong-SHA-512, and missing required asset cases.
- Valid public asset set passes without any local installer comparison.
- Publisher produces one package generation and uploads only exact verified paths.
- Existing release/tag conflict refuses rather than mutating history.
- Full verification rail and release dry run exit 0.
- CLOSEOUT_PLAN.md accurately begins recovery at CORE-106 then CORE-107/v0.3.9.

## Commands
`npm run test:scripts`; `npm run verify`; `npm run release -- 0.3.9 --ticket CORE-107 --dry-run`. Network-writing commands are not used on this implementation ticket.

## Failure and deviation rules
A test failure stops the PR. If explicit GitHub release creation cannot preserve release notes/latest semantics, record the exact CLI/API behavior and amend the plan before coding an alternate. Any runtime defect discovered becomes a separate ticket.

## Stop condition
Stop after CORE-106 has a reviewed, merged PR and exact-merge proof. Do not publish v0.3.9 here; CORE-107 owns publication and installed-product verification.
