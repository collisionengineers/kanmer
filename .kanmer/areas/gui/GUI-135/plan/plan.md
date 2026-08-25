# Plan — GUI-135

## Objective

Make protected bearer storage work on packaged Windows Electron 31 while retaining fail-closed behavior on every platform.

## Starting state

secrets.ts unconditionally calls getSelectedStorageBackend. Electron documents that method as Linux-only; packaged Windows safeStorage therefore throws before encryption. isEncryptionAvailable, encryptString, and decryptString are the cross-platform synchronous contract.

## Governing docs

Meets docs/functional/frd/FRD-025-remote-access.md by using Windows DPAPI through Electron safeStorage and continuing to refuse unavailable or Linux basic_text storage. No governing-doc change is needed.

## Required changes

- Make getSelectedStorageBackend optional in the injected backend type.
- Require isEncryptionAvailable on all platforms.
- On Linux only, require a recognized non-plaintext selected backend; on Windows/macOS identify the documented platform backend without calling the Linux-only method.
- Extend unit coverage for Windows absence, Linux safe backends, Linux basic_text/unknown, and unavailable encryption.

## Expected files

Only apps/gui/src/main/remoteAccess/secrets.ts and secrets.test.ts.

## Do not modify

Do not add fallback encryption, change persisted bytes/ids, weaken token validation, modify manager/provider code, or add dependencies.

## Constraints

Tests inject platform explicitly so host OS does not hide branches. Existing encrypted files remain decryptable because encryptString/decryptString are unchanged.

## Ordered steps

1. Refactor secureBackend around platform-valid capabilities.
2. Add platform matrix tests.
3. Run focused secrets/manager/preload/Settings tests, GUI typecheck, and diff checks.
4. Report, commit, push, open PR, and stop in Review.

## Acceptance checks

Packaged Windows Create token reaches encryptString instead of throwing TypeError; Linux basic_text and unknown remain refused; unavailable encryption remains refused; no plaintext path exists.

## Commands

- npm test -w @kanmer/gui -- --run src/main/remoteAccess/secrets.test.ts src/main/remoteAccess/manager.test.ts src/preload/index.test.ts src/renderer/src/components/Settings.remote.test.tsx
- npm run typecheck -w @kanmer/gui
- git diff --check

## Failure and deviation rules

Do not substitute another crypto library or persist plaintext. Any format migration is new scope.

## Stop condition

Stop when the supported safeStorage platform contract is covered, checks pass, the PR is open, and GUI-135 is in Review. Do not merge during execution.
