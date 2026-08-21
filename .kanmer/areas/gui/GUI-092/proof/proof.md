# Proof — GUI-092

## Merged result

Verified on merged `main` at `e5070de55d7901e059afb349891006570ecefe12` (PR [#100](https://github.com/collisionengineers/kanmer/pull/100), merged 2026-08-21T01:29:51Z).

## Evidence

| Check | Result |
|---|---|
| `npm run test:scripts` | Passed: 59 tests, 0 failures. This includes the added `verifyLocalArtifacts` cases for a valid manifest/installer pair, a SHA-512 mismatch, and a manifest that does not describe the release version. |
| `npm run typecheck` | Passed for `@kanmer/core`, `@kanmer/mcp-server`, `@kanmer/ui`, and `@kanmer/gui`. |
| `npm run build -w @kanmer/gui` | Passed: Electron Vite main, preload, and renderer production builds completed. |
| `npx electron-builder --win --publish never` from `apps/gui` | Passed: produced one local NSIS installer and blockmap without publishing. |
| `node scripts/check-updater-package.mjs` | Passed: `updater package OK (7 checks)`. |
| `git diff --check` | Passed with no whitespace errors on merged main. |

The earlier root-directory Electron Builder invocation was rejected because the root is not the GUI app package; it was not used as evidence. The valid `apps/gui` invocation above completed successfully.

## Behaviour proved

- The merged release script has one Windows publish-capable package invocation, so it cannot generate a second NSIS installer after `latest.yml` is created.
- Local coherence verification rejects a manifest whose SHA-512 does not match its installer and a manifest for the wrong version.
- The packaged app still contains the required updater resources under the no-network packaging analogue.

## Limit / follow-up

No production release was cut for this ticket, and no installed-client update was claimed. A real release must run the sole `--publish always` package path and remote digest verification; the prior-version installed-client acceptance remains tracked by [[GUI-068]].
