## Review — 2026-08-21

**Reviewer relationship:** self-review, not independent; the parent explicitly delegated the full GUI-091 pipeline to Done and no separate reviewer is available in this lane.

### Changes reviewed

- `apps/gui/src/main/smokeCapture.ts` isolates opt-in capture-path validation, visible marker injection/readback, `webContents.capturePage()` conversion, and exclusive PNG output writes.
- `apps/gui/src/main/index.ts` invokes that helper only inside the existing `KANMER_SMOKE` path, after `did-finish-load` and `ready-to-show`; all capture errors exit non-zero and the original no-capture exit path remains intact.
- `smokeCapture.test.ts` covers opt-in/invalid paths, non-overwrite output behavior, successful marker/capture flow, stale marker, empty image, and empty PNG failures.
- `AGENTS.md` records the exact invocation and makes the renderer-only/native-dialog boundary explicit.

### Comments and disposition

- Non-blocking: `capturePage()` is page-only, not native chrome/dialog capture. **Won't-do here**: documented and correctly retained on [[GUI-068]].
- Blocking: none. The fresh 1264×755 live Electron PNG visibly contained the generated marker, so the compositor timing concern is resolved by real platform evidence in addition to failure-closed code/tests.

### Checks

- Report matches all four changed files and does not overclaim native-dialog support.
- No governing-document ref exists; the plan correctly states why this spike changes no product contract.
- PASS: focused `smokeCapture.test.ts` (5 tests), full GUI suite, GUI typecheck/build, `git diff --check`, and a real marker-bearing Electron capture.

**Verdict: PASS (self-review).** PR #98 may merge; merged-main proof remains required before Done.
