# Research — GUI-068: automatic update path verification

## Question

What remains unproven after GUI-064, and what exact packaged-build exercise can close it without overstating evidence?

## Findings

- GUI-064 proved the Windows failure mechanism: a live Electron-as-Node MCP process holds `icudtl.dat` and `v8_context_snapshot.bin` without delete sharing; clearing that process changes the install directory from two blocked files to zero.
- GUI-064's proof explicitly did not exercise the automatic update path, visually inspect the refusal dialog, or measure respawn timing. GUI-068 exists to close exactly those three gaps.
- `apps/gui/src/main/updater.ts` owns download/install state and performs the final stop-and-confirm operation before `quitAndInstall`; `apps/gui/src/main/mcp-sessions.ts` implements the bounded Windows stop/probe behavior.
- FRD-021 requires a real packaged build with a newer published release, a visible and actionable refusal when sessions cannot be cleared, and preservation of the installed executable registration path.
- The verification must begin from a clean installed release that already contains GUI-064's fix. It cannot be substituted by dev mode, unit tests, a manual installer launch, or source inspection.
- Any retry-constant change is justified only by measured respawn behavior. A failed measurement or unrelated installer fault is not a pass.

## Implications

Treat this as a release-bound verification run. Capture the automatic happy path, a deliberately uncleared holder that forces refusal, and timestamped respawn polling. If measured behavior invalidates the retry constants, update them within this ticket and repeat the packaged cycle before proof.

## Open questions

None. Use the earliest reproducible pair of published packaged versions in which the starting version contains GUI-064.
