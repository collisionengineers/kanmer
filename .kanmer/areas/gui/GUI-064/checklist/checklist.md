# Checklist — GUI-064

Derived from plan.md. Step 1 gates the rest — do not start coding until it is
answered.

- [ ] **1. Measure respawn.** Kill the live MCP server pid; record whether a
      replacement appears under `$INSTDIR` and after how long. Write the timing
      into Progress notes — step 4's retry loop is sized from it.
- [ ] **2. Pids through the parser.** Add `ProcessId` to the CIM
      `Select-Object` (`main/mcp-sessions.ts:23-26`) and surface pids on
      `McpSessions`; existing narrowing and fail-open behaviour unchanged.
- [ ] **3. `stopMcpSessions()`** in `main/mcp-sessions.ts` — `taskkill /pid /T
      /F` per `dispatch.ts:51-63`, re-probe, return `{ stopped, remaining }`,
      injectable executor per `dispatch.ts:38-43`, inert off Windows and
      unpackaged.
- [ ] **4. Bounded hold-down loop** sized by step 1, so a respawn inside the
      window does not re-lock ICU.
- [ ] **5. `installUpdateNow` becomes a precondition** — stop, verify, and only
      then `quitAndInstall`; return the remaining sessions instead of installing
      when it cannot be cleared.
- [ ] **6. `CH.installUpdate` returns the result** (`main/index.ts:828-836`) and
      a refusal reaches the renderer.
- [ ] **7. Refusal is visible and actionable** — names the processes still
      holding the install dir; app stays running, update stays staged.
- [ ] **8. Quit path fixed** — `maybeBlockQuitForUpdate` gets the same
      precondition using the synchronous `execFileSync` idiom; on failure set
      `autoInstallOnAppQuit = false` and quit cleanly.
- [ ] **9. `restartWarning` wording corrected** — it must no longer say the
      installer closes the sessions.
- [ ] **10. Tests** — parser pid extraction (incl. malformed/absent rows);
      `stopMcpSessions` clear / partial / nothing-to-do / respawn with an
      injected executor; `restartWarning` wording; handler refusal shape.
- [ ] **11. Rail green** — `npm test` (gui), `npm run typecheck`, `npm run
      dist:check`.
- [ ] **12. Real two-version install cycle, success case** — packaged build,
      live agent MCP session against the installed app, take the update: it
      completes. Capture the lock probe before and after (`blocked: 3` →
      `blocked: 0`).
- [ ] **13. Real refusal case** — an `ELECTRON_RUN_AS_NODE` holder outside our
      predicate produces a **named refusal**, not `uninstallFailed: 2`. This box
      is the one that proves the user-facing half.
- [ ] **14. Docs** — FRD-021 as-built notes, AGENTS.md gotcha 10 + §11
      limitation, `apps/gui/release-notes.md`.
- [ ] **15. Verification run → `proof.md`** (command log from 11–13, plus the
      refusal dialog as visual proof).

## Progress notes

(append with `set_ticket_doc(doc: "checklist", append: true)`)
