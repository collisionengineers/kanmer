# GUI-091 checklist

- [x] Re-read the main-process boot/smoke lifecycle and isolate the smallest testable capture-output helper.
- [x] Implement an opt-in `KANMER_SMOKE_CAPTURE_PATH` route that is inert outside smoke mode.
- [x] After the live renderer is ready, write and read back a unique DOM marker before calling `webContents.capturePage()`.
- [x] Reject empty/invalid capture output and return a non-zero smoke result on marker, capture, or write failure.
- [x] Write the captured PNG to the explicit caller-provided path without changing user settings, IPC, or normal application behaviour.
- [x] Add focused automated tests for path/output and smoke decision boundaries.
- [x] Document the capture command, expected artifact, fresh user-data requirement, and renderer-only limitation.
- [x] Run focused GUI tests, the full GUI suite, GUI build, typecheck, and diff check.
- [x] Run a real Electron smoke capture, confirm non-empty PNG, inspect it for the current unique marker, and record dimensions.
- [x] Confirm the regular smoke lifecycle remains unchanged when `KANMER_SMOKE_CAPTURE_PATH` is absent.
- [x] Write the post-implementation report with commands, artifacts, limitation, and out-of-scope GUI-068 note.
- [x] Open PR #98 with commit/PR traceability; independent review is next.
- [ ] After merge, verify the capture workflow on `main`, write proof, move Done, and close out the worktree/branch.
