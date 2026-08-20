# Plan — GUI-084

## Decision gate

Do not implement until the open styling-contract question is answered.

## Common evidence

1. Retain and verify the existing doc-name-agnostic `classifyKanmerPath` route, which already fixes ticket identity, casing, click targeting, and own-write suppression for document changes.
2. Confirm unfocused notifications remain native as required by FRD-018.

## If the recommended native route is selected

3. Record merged-main evidence that the functional bug is already fixed; no code change is needed for OS-owned chrome.

## If the Windows-custom route is selected

3. Add a Windows-only `toastXml` builder that preserves ticket identity and click behaviour.
4. Add focused tests for XML escaping, notification payload selection, and Windows-only fallback; keep macOS on native `Notification`.
5. Test packaged Windows behaviour and document the platform difference.

## Governing docs

FRD-018 requires native OS notifications while unfocused. An in-app replacement is out of scope unless FRD-018 changes.
