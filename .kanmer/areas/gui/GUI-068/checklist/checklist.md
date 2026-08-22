# Checklist — GUI-068

- [x] Confirm the MCP session is cleared and the automatic installer completes without manual intervention. Existing controlled scratch evidence records the real 0.3.2 → 0.3.3 app-driven update; the session dropped and required the expected reconnect afterwards.
- [x] Summarise GUI-064's three former evidence gaps point by point in the post-implementation report.

## Progress notes

- `npm ci --ignore-scripts --no-audit --no-fund` exit 0 (648 packages).
- Focused updater tests exit 0: 3 files, 40 tests.
- First full GUI run exit 1 was preserved in the report: fresh-worktree core entry resolution failures plus one 10s Git hook timeout; after `npm run build:core` exit 0, the full GUI rerun exited 0 with 37 files/351 tests.
- `npm run typecheck` exit 0.
- `npm run dist:check` exit 0; `updater package OK (8 checks)`.
- No product source diff, commit, or PR; this is a documentation/evidence reconciliation handoff.
- Visual refusal and numerical respawn evidence remain explicitly INCONCLUSIVE; no unavailable host proof is claimed.

**2 of 13 executed checklist items are closed; the remaining live/manual items are intentionally not ticked.**

---

## Closeout — GUI-068

- [x] PR merge verified (N/A — GUI-068 is evidence-only and has no PR; GUI-064 implementation PR #29 is merged.)
- [x] proof.md finalised (current merged-main proof and upstream PR reference recorded)
- [x] Moved to final stage (verifying → done)
- [x] Outcome recorded in ticket body (no GUI-068 source commit/PR; external evidence dispositions recorded)
- [x] cd out of worktree; recorded .worktrees/gui-068 already absent
- [x] recorded branch gui-068-auto-update-verification already absent
- [x] git fetch --prune + git worktree prune completed
- [x] take_ticket action: release completed

## Parked (explicitly deferred)
- Deferred/inconclusive: Prepare an isolated Windows install of a released build containing GUI-064 and record the baseline.
- Deferred/inconclusive: Start a real installed-app MCP session and capture its process and locked-file state.
- Deferred/inconclusive: Trigger the newer release through Kanmer's own update UI.
- Deferred/inconclusive: Confirm the newer app version starts and the existing project registration serves a real MCP call. Existing scratch identity evidence is recorded in the report, but this lane did not repeat a live host run.
- Deferred/inconclusive: Force an uncleared Electron-as-Node holder and capture the actionable refusal dialog naming the project. INCONCLUSIVE: no reliable Electron-window capture path was available on this host.
- Deferred/inconclusive: Confirm the refused path does not start the installer or lose the downloaded update state. INCONCLUSIVE: no controlled negative-case holder run.
- Deferred/inconclusive: Measure MCP respawn behavior numerically across the complete retry window. INCONCLUSIVE: no live timing number obtained.
- Deferred/inconclusive: Compare the measurement with STOP_ROUNDS and SETTLE_MS. INCONCLUSIVE because the live measurement is absent; constants unchanged.
- Deferred/inconclusive: If the constants or logic are invalid, correct them, add regression tests, rebuild, and repeat both update scenarios. No source defect was demonstrated; no source changes made.
- Deferred/inconclusive: Run the full test, typecheck, dist:check, and packaged-smoke rail when source changes. No source changes in this evidence-only pass; deterministic full GUI test, typecheck, and dist:check results are recorded in the report.
- Deferred/inconclusive: Record screenshots, redacted command logs, versions, installer result, and registration proof. Existing scratch has version/sha/install evidence; refusal screenshot remains INCONCLUSIVE.
