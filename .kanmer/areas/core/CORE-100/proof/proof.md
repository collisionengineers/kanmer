# Verification proof — CORE-100

## Merged target

- PR [#251](https://github.com/collisionengineers/kanmer/pull/251) merged normally at `41408981ae78364f1d64e3d3b3db3c1ec67d96d1` on 2026-08-24.
- A fresh clean normal GitHub-origin clone of protected `main` resolved both `HEAD` and remote `main` to that exact SHA. `git merge-base --is-ancestor 41408981ae78364f1d64e3d3b3db3c1ec67d96d1 HEAD` exited 0.
- Hosted required checks on the merged PR passed: `verify` and `kanmer-gate` in run 32788167943.

## Evidence

| Check | Result |
|---|---|
| Merge scope and whitespace | PASS — `git diff --check <merge>^ <merge>` exit 0; exactly `AGENTS.md`, `apps/gui/electron-builder.yml`, and `scripts/verify-release-assets.test.mjs` changed. |
| Explicit configuration/source contract | PASS — `win.artifactName: "${productName}-Setup-${version}.${ext}"` is present; source checks locate the v0.3.6 strict-failure regression and the contributor guidance names the same public asset contract. |
| Clean dependency install | PASS — `npm ci --ignore-scripts` exit 0 (npm reported its audit advisory only). |
| Strict release-asset regression | PASS — `node --test scripts/verify-release-assets.test.mjs` exit 0, 46/46. It retains the exact four v0.3.6 failures and treats dotted duplicate assets only as informational extras. |
| Isolated core/server build | PASS — `npm run build` exit 0. |
| Explicit non-publishing package rail | PASS — `npm run dist -w @kanmer/gui -- --publish never` exit 0 after the isolated build; it emitted `Kanmer-Setup-0.3.6.exe` and matching blockmap. |
| Packaged updater validation | PASS — `node scripts/check-updater-package.mjs` exit 0, 8 checks. |
| Historical v0.3.6 public check | Expected non-pass preserved — read-only `node scripts/verify-release-assets.mjs 0.3.6 --dir apps/gui/release` exit 1 with the four required failures: absent manifest-named installer; blockmap size mismatch; blockmap SHA-256 mismatch; and `latest.yml` SHA-256 mismatch. No release-side action was performed. |
| Full merged-main rail | PASS — `npm run verify` exit 0: core 310/310, GUI 468/468, MCP HTTP 102/102, scripts 102/102, all-workspace typecheck, docs, MCP smokes, MCPB, skills, managed-block, and plugin checks. |
| Final clone cleanliness | PASS — `git status --porcelain` was empty after the checks. |

This proves the forward contract required by FRD-021: Electron Builder now emits the explicit safe hyphenated installer name, and the verifier remains strict about presence, state, byte integrity, and the manifest bridge. It does not claim that v0.3.6 became valid: that public release remains historical failure evidence with its tag, release, assets, workflow, and publication state read only.

## Preserved invocation limitations

- An initial overly-specific text probe for a non-existent test sentence exited 1 after the merge-scope/config checks. It was an inspection-command wording error, not an assertion regression; the subsequent source checks located the actual v0.3.6 test at its real title and the 46-test suite passed. The exit is retained here.
- The first no-publish package invocation exited 1 before Electron Builder because a fresh `npm ci --ignore-scripts` clone has no `@kanmer/core` build output. `npm run build` then exited 0 and the same no-publish package rail passed. No publication, tag, upload, release edit, repair, or retry occurred.

A future successor release remains outside CORE-100 and requires its own governed ticket.
