# Plan — GUI-128: complete sync-test Notification mock

## Objective

Make the existing Electron test double match the static Notification API reached by delayed sync-test toast callbacks, so the focused file exits cleanly without changing production behavior.

## Governing docs

- `docs/functional/frd/FRD-019-gui-shell.md` is met by preserving the production GUI shell and using a test-only mock that represents an unavailable native notification facility.

## Steps

1. Reconfirm the unhandled error, mock shape, and production static guard.
2. Add `static isSupported(): boolean { return false; }` to the existing `Notification` mock in `index.sync.test.ts`; make no other source change.
3. Run the focused sync test and require both 11 behavioral assertions and process exit 0 without unhandled errors.
4. Run typecheck, `git diff --check`, and the canonical GUI/root verification rails. Record any independent failure without absorbing it.
5. Commit, open a PR with `Kanmer: GUI-128`, and hand it to review. Do not merge.

## Risks

| Risk | Mitigation |
| --- | --- |
| Mocking a behavior not exercised by production. | Match only the static guard actually called; return false to avoid false native-notification behavior. |
| Hiding an unhandled error. | Require Vitest process exit 0 and no unhandled-error output. |
| Scope creep into settings persistence. | The separate settings atomic-write error remains out of scope. |

## Acceptance

- One test-only mock change.
- Focused sync test exits 0 without unhandled errors.
- Typecheck and diff check pass.
- Full rails are recorded truthfully; no independent failure is reclassified.
