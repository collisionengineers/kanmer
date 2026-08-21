# GUI-091 checklist

- [ ] Re-read the main-process boot/smoke lifecycle and isolate the smallest testable capture-output helper.
- [ ] Implement an opt-in `KANMER_SMOKE_CAPTURE_PATH` route that is inert outside smoke mode.
- [ ] After the live renderer is ready, write and read back a unique DOM marker before calling `webContents.capturePage()`.
- [ ] Reject empty/invalid capture output and return a non-zero smoke result on marker, capture, or write failure.
- [ ] Write the captured PNG to the explicit caller-provided path without changing user settings, IPC, or normal application behaviour.
- [ ] Add focused automated tests for path/output and smoke decision boundaries.
- [ ] Document the capture command, expected artifact, fresh user-data requirement, and renderer-only limitation.
- [ ] Run focused GUI tests and GUI typecheck.
- [ ] Run a real Electron smoke capture, confirm exit 0 and non-empty PNG, inspect it for the current unique marker, and record dimensions.
- [ ] Confirm the regular smoke path remains successful without `KANMER_SMOKE_CAPTURE_PATH`.
- [ ] Write the post-implementation report with commands, artifacts, limitation, and out-of-scope GUI-068 note.
- [ ] Open a ticket-named PR with commits/PR traceability and independent review.
- [ ] After merge, verify the capture workflow on `main`, write proof, move Done, and close out the worktree/branch.
