# Post-implementation report — GUI-068

## Outcome

This was an evidence/reconciliation pass against the already merged GUI-064 updater implementation. No product source files changed, no constants were changed, and no new commit or PR was created. The deterministic updater and package rails are green. The remaining live-host and visual items are explicitly INCONCLUSIVE because this lane did not have a controlled two-version release host or a reliable Electron-window capture path.

## Scope and governing requirement

The work stayed within GUI-068: verify the automatic Windows update path, reconcile GUI-064's former evidence gaps, and record what can and cannot be proven. FRD-021 R1–R4 were checked against the existing updater/session implementation and packaged output. GUI-065/066/067, provider registration, MCP-005, and moving the MCP runtime outside the install directory were not changed.

## Evidence disposition

### 1. Automatic update with a live agent session — PASS (existing controlled evidence)

The ticket scratch record contains the real 0.3.2 → 0.3.3 update run from 2026-08-17, driven through the app updater with a live agent MCP session. The installed packaged server changed from 0.3.2 sha `e92a2679…` to 0.3.3 sha `03196057…`, `build: packaged`; no manual installer step, `uninstallFailed: 2`, or hand-stopping was required. A registered MCP server returned the new packaged identity after the update. The agent session dropped and required a manual `/mcp` reconnect afterwards; that is the expected FRD-021 live-session cost and is recorded, not hidden. This closes GUI-068 checklist item 4 / the unaided-install box using the existing controlled evidence, rather than claiming a new live run from this worktree.

### 2. Refusal dialog and retained staged update — INCONCLUSIVE

No human-visible refusal dialog was captured in this lane. GUI-091 records that three capture routes failed on this host while the renderer remained alive; `webContents.capturePage()` was not available as a completed capture route. Therefore I make no claim about visual wording, project naming, or the refusal-path screenshot requirement. The unit tests and packaged source verify the refusal logic and strings, but that is not visual proof. The no-installer/retained-download-state negative path was likewise not re-run on a controlled holder, so it remains INCONCLUSIVE rather than PASS.

### 3. Respawn timing and retry constants — INCONCLUSIVE

No numerical live respawn measurement was obtained. The existing implementation constants (`STOP_ROUNDS = 3`, `SETTLE_MS = 700`) were not changed. Deterministic tests cover convergence after respawn and refusal when a holder respawns forever, but they do not substitute for the requested real-host timing number. No timing-based design conclusion is claimed.

### 4. GUI-064 proof gaps, point by point

- Automatic two-version update: answered by the recorded 0.3.2 → 0.3.3 app-driven run above.
- Human-visible refusal dialog: not answered; INCONCLUSIVE pending a capture-capable Windows session.
- Respawn timing: not answered; INCONCLUSIVE pending a live process poll.
- GUI-064's original hand-driven 0.3.0 → 0.3.2 install remains historical mechanism evidence, not automatic-path proof; the newer scratch evidence is the automatic-path proof.

## Deterministic/package rails

- `npm ci --ignore-scripts --no-audit --no-fund` — exit 0; 648 packages installed.
- Focused updater tests (shared/main/renderer) — exit 0; 3 files, 40 tests passed.
- First full GUI test run — exit 1; preserved setup evidence: 30 files/248 tests passed, 7 suites could not resolve the unbuilt `@kanmer/core` entry in the fresh worktree, and `renameBoardBranch` hit its 10s hook timeout.
- `npm run build:core` — exit 0.
- Full GUI test rerun — exit 0; 37 files, 351 tests passed.
- `npm run typecheck` — exit 0 across core, mcp-server, ui, and gui.
- `npm run dist:check` — exit 0; Windows NSIS package built and `updater package OK (8 checks)`.

The package build generated no tracked source diff. The packed artifact was built from the current merged base and validates the updater packaging contract; it does not provide the missing two-version refusal screenshot or live timing proof.

## Review handoff

No source commit or PR exists for this evidence-only pass. The ticket documents and scratch evidence are the reviewable deliverable. GUI-068 is ready at Review with the three external gaps marked INCONCLUSIVE and the exact failed first-rail result preserved above.
