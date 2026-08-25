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
