# Checklist — GUI-068

- [ ] Prepare an isolated Windows install of a released build containing GUI-064 and record the baseline.
- [ ] Start a real installed-app MCP session and capture its process and locked-file state.
- [ ] Trigger the newer release through Kanmer's own update UI.
- [ ] Confirm the MCP session is cleared and the automatic installer completes without manual intervention.
- [ ] Confirm the newer app version starts and the existing project registration serves a real MCP call.
- [ ] Force an uncleared Electron-as-Node holder and capture the actionable refusal dialog naming the project.
- [ ] Confirm the refused path does not start the installer or lose the downloaded update state.
- [ ] Measure MCP respawn behavior numerically across the complete retry window.
- [ ] Compare the measurement with STOP_ROUNDS and SETTLE_MS.
- [ ] If the constants or logic are invalid, correct them, add regression tests, rebuild, and repeat both update scenarios.
- [ ] Run the full test, typecheck, dist:check, and packaged-smoke rail when source changes.
- [ ] Record screenshots, redacted command logs, versions, installer result, and registration proof.
- [ ] Summarise GUI-064's three former evidence gaps point by point in the post-implementation report.

## Progress notes
