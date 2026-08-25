# Post-implementation report

## Outcome
Replaced the competing Electron Builder/GitHub publication flow with one authoritative package generation, explicit immutable release creation and exact asset upload. Independent tag CI now validates the public manifest and downloaded installer rather than requiring byte identity with a separately signed NSIS build. Added the requested repository-root closeout plan with v0.3.8 recorded as failed evidence and CORE-107/v0.3.9 as the recovery release.

## Production path
`scripts/release.mjs` remains the sole release entry point. It verifies and prepares the release commit, refuses pre-existing tags/releases, packages once with publication disabled, validates that package, creates the release, uploads its exact installer/blockmap/MCPB/manifest set, then compares GitHub metadata to the retained local bytes. `.github/workflows/release.yml` consumes the public release in `--remote-coherent` mode.

## Files changed
- `.github/workflows/release.yml`: public-set coherence verification.
- `scripts/release.mjs`: single package owner, explicit create/upload, immutable conflict refusal.
- `scripts/verify-release-assets.mjs`: exact public shape and downloaded manifest/installer coherence.
- `scripts/release-flow.test.mjs`, `scripts/release-publish.test.mjs`, `scripts/verify-release-assets.test.mjs`: deterministic regressions.
- `scripts/release-publish.mjs`: exact upload construction only; obsolete repair path removed.
- `AGENTS.md`: current release convention.
- `CLOSEOUT_PLAN.md`: full ordered recovery and product-closeout handoff.

## Verification evidence
- `node --test scripts/verify-release-assets.test.mjs scripts/release-flow.test.mjs scripts/release-publish.test.mjs` — exit 0, 60/60.
- `npm run test:scripts` — first attempt failed because the fresh worktree lacked built core output; after `npm run build:core`, exit 0, 116/116 at that revision. The final full rail reran the current script set and passed 111/111 after obsolete repair tests were removed.
- `npm run verify` — first attempt reached MCPB validation and failed because the fresh worktree lacked the MCPB CLI dependency. `npm ci` restored the lockfile-defined dependency tree. Final attempt exit 0: core 310/310, GUI 477/477, MCP HTTP 102/102, scripts 111/111, typecheck, docs, stdio/protocol/discovery smokes, MCPB, skills, AGENTS block, and plugin sync all passed.
- `git diff --check` — exit 0.

## Deviations and disposition
The original plan assigned a v0.3.9 dry run to CORE-106. That command requires v0.3.9 release notes/version preparation and therefore crosses the explicit stop condition into CORE-107 release scope. The plan and checklist were amended before handoff: CORE-107 owns that dry run and all remote release writes. No dependency was added; `npm ci` only materialized the existing lockfile.

## Known non-blocking observation
`npm ci` reported existing audit findings (4 low, 4 moderate, 4 high, 1 critical). This remediation did not run an automatic audit fix because dependency upgrades are outside the ticket and require their own evidence/scope.

## Scope confirmation
No runtime updater, Codex launcher, remote-access runtime, dependency version, existing tag/release, or branch-protection behavior was modified. No secrets were written.

## Review remediation
Independent review of head `3ceafecd24c768d169b2a5cfaf803783f09eed13` recorded F-001 (major): the initial explicit flow made the release public/latest before upload and verification completed. Head `9def9c09c4e3b8c04d2880094782533fe48b82cc` fixes the finding by creating a draft, uploading and verifying the exact retained package while it remains hidden, and only then running `gh release edit ... --draft=false --latest`. The release-flow regression now asserts create-draft < upload < verify < publish. Focused release tests pass 60/60 and `git diff --check` exits 0. The fresh head must receive a new independent attestation and green required CI before merge.

## Second review remediation
The second independent review identified F-002 and F-003. Head `ff0f6033` normalizes the selected documented release credential into `GH_TOKEN` before any publish-mode `gh` command, so `GITHUB_RELEASE_TOKEN`, `GH_TOKEN`, and `GITHUB_TOKEN` all drive the same explicit identity used by REST verification. It also replaces the ambiguous `gh release view` exit-code inference with the typed REST release lookup: only `not-found` permits tag creation; auth, rate-limit, malformed response, network, and server failures refuse before the immutable tag is created. Source regression assertions cover both rules. Focused release tests pass 60/60, the full script rail passes 111/111, and `git diff --check` exits 0. Fresh hosted CI and independent review remain required.

## Third review remediation
Review caught that the typed release lookup had been passed an unused `version` property rather than its required `tag`. Head `05083f4075d0588ceec633725e40774d0badd5a5` now passes `tag: releaseTag(version)` and removes the misleading extra property. The source regression pins that exact argument. Focused release tests pass 60/60 and `git diff --check` exits 0. Fresh hosted CI and independent review remain required.

## Fourth review remediation
Review findings F-005 through F-007 are addressed on head `5b3b61af85359c3a4f2c9d708856d1b3d1920964`. Missing or non-SHA256 GitHub digests are now hard errors in local-to-draft verification. Remote-coherent CLI maps a not-yet-created release or draft browser-download 404 to exit 1 so tag CI retries, while authentication, rate-limit, malformed, network, and other API failures remain exit 2/inconclusive. Public asset names now come from `releaseAssetNames(version)`, the single helper shared by publisher and remote verification. Regression tests cover the canonical set, hard digest failures, draft visibility races, and exit classification. Focused tests pass 62/62; the complete script rail passes 113/113; `git diff --check` exits 0. Fresh hosted CI and independent review remain required.

## Canonical upload-set completion
The reviewer correctly noted that defining the canonical names only in the remote verifier did not constrain the publisher. Head `61010005cc0829bfb6cfd272072cd5e4bfbdddf5` completes F-007: `exactUploadSpecs(expected, version)` now compares the package-derived local names to `releaseAssetNames(version)` and refuses any missing, renamed, duplicate, or extra output before release creation. The same helper therefore governs both publisher acceptance and independent remote validation. Integration-level tests prove the exact four-name upload set and reject incomplete/extra sets. Focused tests pass 62/62, scripts pass 113/113, and `git diff --check` exits 0. Fresh hosted CI and independent review remain required.

## Immutable-tag and repository-target remediation
Findings F-008 and F-009 are addressed on head `6aee92d5bcdedf75ed9da277cfb5d23ad96ea0e3`. The single Windows package, MCPB copy, updater-package check, local manifest coherence, and canonical upload-set check all complete before any local or remote tag is created. A failed tag push removes only the retry-blocking local tag, refuses before release creation, and leaves any competing remote tag immutable. Every `gh release create`, `upload`, and `edit` command now pins `--repo collisionengineers/kanmer`, independent of ambient `GH_REPO`. Ordering and command-target regressions are asserted. Focused tests pass 62/62, scripts pass 113/113, and `git diff --check` exits 0. Fresh hosted CI and independent review remain required.
