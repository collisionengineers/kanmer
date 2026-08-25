# Plan — GUI-134

## Objective

Make the installed Cloudflare Create token and Rotate token actions succeed after a configuration save while retaining optimistic concurrency protection.

## Starting state

The main IPC handler and RemoteAccessManager accept an expected configuration generation. The preload bridge exposes only project id and rotate, so it always invokes main without the current generation. Main normalizes that omission to null and the manager correctly rejects it after the saved configuration has a UUID generation.

## Governing docs

Meets docs/functional/frd/FRD-025-remote-access.md by restoring the existing protected one-time bearer flow and preserving per-project concurrency enforcement. No governing document changes are required.

## Required changes

- Add expectedConfigGeneration to the typed Kanmer API remoteCreateSecret signature.
- Forward it through preload as the third remoteCreateSecret IPC argument.
- Pass view.status.configGeneration from both Create token and Rotate token production callers.
- Add regression coverage at the bridge/caller boundary proving the generation is forwarded unchanged.

## Expected files

Only apps/gui/src/shared/ipc.ts, apps/gui/src/preload/index.ts, apps/gui/src/renderer/src/components/Settings.tsx, and the narrow existing test files needed to prove forwarding.

## Do not modify

Do not change RemoteAccessManager concurrency semantics, main-handler validation, persistent configuration format, secret backend, Cloudflare adapter, tunnel resources, or dependencies.

## Constraints

Keep the change source-compatible within the app by making every production caller supply the current nullable generation. A stale generation must continue to fail. Tests must assert exact argument propagation, not weaken the manager.

## Ordered steps

1. Update the shared API signature and preload forwarding.
2. Update Create and Rotate production callers to pass the displayed configuration generation.
3. Add bridge and/or renderer regression assertions for the exact third argument.
4. Run focused GUI tests, full GUI typecheck, git diff --check, and a secret scan of the diff.
5. Write the implementation report, commit, push, open a PR with Kanmer: GUI-134, and stop in Review.

## Acceptance checks

- Production Create token after Save no longer fails solely because the generation was dropped.
- Rotate uses the same current-generation contract.
- Stale/null mismatches remain rejected by the manager.
- Focused tests and GUI typecheck pass without assertion weakening.

## Commands

- npm test -w @kanmer/gui -- --run apps/gui/src/preload/index.test.ts apps/gui/src/renderer/src/components/Settings.remote.test.tsx
- npm run typecheck -w @kanmer/gui
- git diff --check

## Failure and deviation rules

If the existing test seams cannot observe the bridge, add the smallest test seam in an already scoped test file. Do not expand into manager, provider, or release behavior.

## Stop condition

Stop when the typed bridge and both production callers forward configGeneration, focused tests and typecheck pass, the bounded PR is open, and GUI-134 is in Review. Do not merge during execution.
