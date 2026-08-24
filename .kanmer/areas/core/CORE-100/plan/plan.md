# Plan — CORE-100: deterministic Windows release asset names

## Outcome

Make the *future* Windows NSIS release contract explicit: local installer, `latest.yml`, GitHub release upload, exact-file recovery, and the existing strict verifier use the single public name `Kanmer-Setup-<version>.exe`. The mixed v0.3.6 release remains preserved evidence of a failed release; it is not repaired or reclassified.

## Governing documents

- `docs/functional/frd/FRD-021-auto-update.md` — packaged update metadata must resolve to an actual, integrity-checked release asset.
- [[HZN-007]] `context.md` — one-boundary workflow, preserve failures, no self-review/merge, and worktrees only after taking the ticket.
- `AGENTS.md` rules 19, 20, 23, and 24 — preserve assertions and failures, record exits, keep secrets absent, and update contributor guidance with a changed public convention.

## Implementation approach

1. In a later separately authorized execution phase, take CORE-100 in its recorded dedicated worktree from current `origin/main`; do not reuse any release clone or historical worktree.
2. Set the explicit Windows Electron Builder pattern under `win:` in `apps/gui/electron-builder.yml` to `artifactName: "${productName}-Setup-${version}.${ext}"`. This uses an already-safe name and removes the implicit default/local-to-upload transformation as a release contract.
3. Keep `scripts/verify-release-assets.mjs` functional behavior unchanged: `githubName`, required uploaded state, required presence, size, SHA-256, blockmap, and `latest.yml` URL/size/SHA-512 checks remain strict. Change only its explanatory prose if it would otherwise describe the now-obsolete implicit naming premise.
4. Extend `scripts/verify-release-assets.test.mjs` with:
   - a configuration contract that requires `artifactName: "${productName}-Setup-${version}.${ext}"`; and
   - an exact v0.3.6 tag-workflow/local-versus-public fixture that preserves all four historical errors: absent `Kanmer-Setup-0.3.6.exe`, the space-origin blockmap's size and SHA-256 mismatches, and the local `latest.yml` SHA-256 mismatch. It must retain the matching hyphen-form manifest URL/size/SHA-512 bridge and classify the dot installer/blockmap plus MCPB as informational extras, so alias acceptance or weakening any byte check cannot turn the release into a pass.
5. Update only the human-owned release guidance in `AGENTS.md`, outside the managed Kanmer block, to state the explicit `Kanmer-Setup-<version>.exe` convention and strict manifest/upload agreement. Do not change workflows, credentials, publication logic, or the managed block.
6. Run focused source tests, script rails, documentation/managed-block validation, and an isolated packaging rail. Record every exit and preserve any failure; do not work around it by loosening tests or changing the published release.
7. Run a read-only v0.3.6 verification using the generated verifier data after the source test. It must remain a FAIL/inconclusive-as-applicable if the public release still lacks the manifest-named hyphenated installer; record its exact output without calling an upload, repair, rerun, or release command.
8. After the bounded source change is independently reviewed and merged, a distinct successor-release ticket may create one fresh clean clone and execute its own preparation/publisher protocol. CORE-100 never tags, publishes, uploads, retags, repairs, or retries a release.

## Acceptance criteria

- `apps/gui/electron-builder.yml` explicitly declares `artifactName: "${productName}-Setup-${version}.${ext}"` for Windows output.
- The verifier continues to reject absent assets, non-uploaded assets, size/digest mismatches, missing blockmaps, and `latest.yml` installer URL/size/SHA-512 inconsistencies; it accepts no dot-name alias.
- The new regression preserves the v0.3.6 tag workflow's exact four strict failures—missing manifest-named installer, blockmap size/digest mismatch, and manifest digest mismatch—while classifying only unrelated/mixed assets as informational extras.
- Contributor documentation accurately states the explicit artifact convention without modifying the Kanmer-managed block.
- The source test rails and package/update validation succeed. A live read-only v0.3.6 check remains an explicitly recorded non-pass until a future separately governed successor release provides fresh evidence.
- No tag, GitHub Release, asset, workflow run, credential, manual upload, or historical release artifact is changed.

## Validation plan

In the future execution worktree, run and record:

1. `node --test scripts/verify-release-assets.test.mjs`
2. `node --test scripts/check-updater-package.test.mjs`
3. `npm run test:scripts`
4. `npm run verify:agents-block` and `npm run verify:docs`
5. `npm run dist -w @kanmer/gui -- --publish never`, then `node scripts/check-updater-package.mjs`, confirming the generated installer and `latest.yml` use the exact hyphenated name while publishing is explicitly disabled.
6. A read-only `node scripts/verify-release-assets.mjs 0.3.6 --dir apps/gui/release` (or the current verifier interface) against the public release metadata, expected to preserve the missing-installer failure rather than pass.
7. Before a PR, the repository's authoritative `npm run verify` from a normal non-worktree checkout, recording the exact head and exit code.

If a source, packaging, or verification rail fails, stop before opening/releasing anything and record the exact failure. A read-only v0.3.6 pass after this change is itself a failure condition: it would indicate an unintended weakening or a changed public release and must be investigated, not accepted.

## Delivery boundary

Future implementation stops at an open PR in Review with its post-implementation report and full evidence. It does not self-review, merge, publish, retag, repair, write proof, move downstream tickets, or perform a successor release. This authorized implementation pass stops only after an open Review PR; it still performs no release preparation, publisher invocation, tag, release, asset upload, repair, retry, or successor release.
