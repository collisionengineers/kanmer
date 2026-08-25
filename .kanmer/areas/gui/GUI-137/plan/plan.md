# Plan — GUI-137

## Objective

Ensure Windows path spelling differences cannot create duplicate remote runtime records or make UI management diverge from persisted auto-start ownership.

## Starting state

Persistence canonicalizes paths, but the in-memory manager uses raw strings.

## Required changes

Use the existing `canonicalProjectPath` for every manager project ownership key, status project id, queue key, registration id, and one-time delivery binding. Add a regression that registers/autostarts with canonical spelling and views/manages with display spelling without spawning twice.

## Expected files

Only the two files in the files document.

## Do not modify

Provider resources, secrets, endpoint protocol, updater, or unrelated managers.

## Constraints

No dependency or persisted schema change. Preserve fail-closed owner enforcement and fingerprint checks.

## Governing docs

FRD-025 requires one explicitly owned runtime per canonical project and manageable restart/autostart behavior.

## Ordered steps

1. Canonicalize manager project ids at its internal boundary.
2. Update all comparisons/maps/delivery bindings to use that canonical key.
3. Add the Windows spelling regression.
4. Run focused tests, GUI typecheck, build, and diff check.
5. Report, commit, push, PR, stop in Review.

## Acceptance checks

Auto-start and opened-project calls share one record, one process, one runtime generation, and one loopback endpoint; a second Start returns the same owned status rather than `REMOTE_OWNER_EXISTS`.

## Commands

- `npm exec vitest run -- src/main/remoteAccess/manager.test.ts` from `apps/gui`
- `npm run typecheck`
- `npm run build`
- `git diff --check`

## Failure and deviation rules

Preserve failures; do not broaden into other runtime managers.

## Stop condition

Stop with the PR open and GUI-137 in Review for independent review.
