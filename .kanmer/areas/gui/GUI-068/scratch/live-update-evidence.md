## Box 1 SATISFIED — 2026-08-17, the real 0.3.2 → 0.3.3 update

**"An update with a live agent session installs with no manual step" — done, unaided.**

The operator took the 0.3.3 update **through the app's own updater**, with a live
agent MCP session running (this orchestrator's own session, driving the board via
the `kanmer` server at the time).

Evidence, measured after the fact rather than asserted:

- The installed server at
  `C:\Users\PC\AppData\Local\Programs\Kanmer\resources\mcp\kanmer-mcp.cjs`
  went from sha256 `e92a2679…` (0.3.2, the stale build) to **`03196057…`,
  version 0.3.3, `build: packaged`**, mtime `2026-08-17T01:42:48Z` — matching the
  0.3.3 build.
- `get_status` from both a Connect-registered and a plugin-installed server
  reports that same sha, so the install replaced the payload cleanly.
- **No manual step was required to make the install proceed.** No
  `uninstallFailed: 2`, no hand-stopping of servers.

**What that means for GUI-064's open question, and for [[MCP-005]]:**
`stopMcpSessions()` did its job on a real update, on the version that ships it —
which is precisely what GUI-064 could not prove, because the fix runs in the
version *doing* the updating and that machine was on 0.3.0 at the time. The
mechanism is now demonstrated end to end.

Note the agent session **did** drop and needed a manual `/mcp` reconnect
afterwards. That is expected and is not a failure of this box: FRD-021 accepts
that an update kills live sessions, and the box asks whether the *install*
needs a manual step. It does not. It is worth recording separately, though,
because it is the user-visible cost that MCP-005 would remove and that
[[MCP-005]] was dropped from 0.3.3 rather than solved.

## Still outstanding — 3 of 4 boxes

- [ ] **Refusal dialog screenshot.** Never seen by a human. And now harder than
      assumed: **[[GUI-091]]** records that no agent on this host can photograph a
      running Electron window — three capture routes tried, all failed, renderer
      provably alive throughout. `webContents.capturePage()` from the main process
      is untried and is the most likely fix.
- [ ] **Respawn timing as a number.** Still unmeasured.
- [ ] **GUI-064's "What this run does NOT prove" answered point by point** —
      partially: the unaided-install point is now answered; the dialog and the
      timing are not.

**This ticket remains parked, but it is 1 of 4 rather than 0 of 4, and the box
that closed is the one that needed a real release to close.**

## 2026-08-21 deterministic reconciliation run

Executed in fresh worktree `gui-068-auto-update-verification` from merged main. No source changes. Focused updater tests: exit 0, 3 files / 40 tests. First full GUI run: exit 1, preserved in post-implementation-report (fresh worktree lacked built @kanmer/core and one 10s Git hook timed out). `npm run build:core`: exit 0. Full GUI rerun: exit 0, 37 files / 351 tests. `npm run typecheck`: exit 0. `npm run dist:check`: exit 0; Windows NSIS package built and `updater package OK (8 checks)`.

The existing controlled scratch evidence remains the only live two-version proof: app-driven 0.3.2 → 0.3.3 with a live agent MCP session, no manual installer step, packaged server identity changed to 0.3.3 sha `03196057…`; the agent session dropped and was manually reconnected afterwards. Refusal screenshot, negative holder path, and numerical respawn timing were not available in this lane and remain INCONCLUSIVE. GUI-064 gaps are point-by-point in the report; no constants or product code changed.
