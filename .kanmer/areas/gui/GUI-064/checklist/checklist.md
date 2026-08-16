# Checklist — GUI-064

Derived from plan.md. Step 1 gates the rest — do not start coding until it is
answered.

- [ ] **1. Measure respawn.** Kill the live MCP server pid; record whether a
      replacement appears under `$INSTDIR` and after how long. Write the timing
      into Progress notes — step 4's retry loop is sized from it.
      **Not done.** See notes: no replacement appeared after the kill, but the
      timing was never measured.
- [x] **2. Pids through the parser.** Add `ProcessId` to the CIM
      `Select-Object` (`main/mcp-sessions.ts:23-26`) and surface pids on
      `McpSessions`; existing narrowing and fail-open behaviour unchanged.
- [x] **3. `stopMcpSessions()`** in `main/mcp-sessions.ts` — `taskkill /pid /T
      /F` per `dispatch.ts:51-63`, re-probe, return `{ stopped, remaining }`,
      injectable executor per `dispatch.ts:38-43`, inert off Windows and
      unpackaged.
- [x] **4. Bounded hold-down loop** sized by step 1, so a respawn inside the
      window does not re-lock ICU. 3 rounds, 700 ms settle — chosen without
      step 1's number, and correct either way.
- [x] **5. `installUpdateNow` becomes a precondition** — stop, verify, and only
      then `quitAndInstall`; return the remaining sessions instead of installing
      when it cannot be cleared.
- [x] **6. `CH.installUpdate` returns the result** (`main/index.ts:828-836`) and
      a refusal reaches the renderer.
- [x] **7. Refusal is visible and actionable** — names the processes still
      holding the install dir; app stays running, update stays staged.
- [x] **8. Quit path fixed** — `maybeBlockQuitForUpdate` gets the same
      precondition using the synchronous `execFileSync` idiom; on failure set
      `autoInstallOnAppQuit = false` and quit cleanly.
- [x] **9. `restartWarning` wording corrected** — closed as **not needed**: the
      sentence never named who closes the sessions, so it stayed true. Comment
      added recording why; no wording changed.
- [x] **10. Tests** — parser pid extraction (incl. malformed/absent rows);
      `stopMcpSessions` clear / partial / nothing-to-do / respawn with an
      injected executor; `restartWarning` wording; handler refusal shape.
- [x] **11. Rail green** — `npm test` 201 passed, typecheck, build, protocol
      smoke 26/26, plugin:check, check:manual, boot smoke exit 0.
- [x] **12. Real two-version install cycle, success case** — 0.3.0 → 0.3.2,
      installer exit code 0 after three prior failures. Lock probe `blocked: 2`
      → `blocked: 0` across the stop. Driven by hand, because the fix runs in
      the version doing the updating and the machine was on 0.3.0.
- [ ] **13. Real refusal case** — an `ELECTRON_RUN_AS_NODE` holder outside our
      predicate produces a **named refusal**, not `uninstallFailed: 2`.
      **Not done.** Logic is unit-tested and both strings are verified present
      in the shipped asar, but no human has seen the dialog.
- [x] **14. Docs** — FRD-021 amendment, AGENTS.md gotcha 10 + §11 limitation,
      `apps/gui/release-notes.md` 0.3.2.
- [x] **15. Verification run → `proof.md`** — written, and committed to
      `kanmer-board` (`5fca4d1`).

**13 of 15 done. Boxes 1 and 13 are deliberately left open** rather than ticked
to make the count look finished — both are recorded in proof.md's "What this run
does NOT prove", and both are answerable for free on the next release
(0.3.2 → 0.3.3), which is the first update that exercises the automatic path.

## Progress notes — implementation

- **Boxes 2–11, 14 done.** PR https://github.com/collisionengineers/kanmer/pull/29
  (`3d56ab9` code, `1d9a10a` docs), plus `c8b94a4`.
- **Box 1 (measure respawn) NOT run during implementation.** It requires killing
  the MCP server that was driving this ticket. The design does not depend on the
  answer — the bounded 3-round loop is correct either way, and both outcomes are
  unit-tested (converges after a respawn; gives up with a refusal if it never
  stops).
- **Caught two bugs in my own design before committing.** The refusal was
  initially delivered via `emit({ phase: "error" })`. `updateSurface` only
  renders `error` for `source === "manual"`, so an auto-check refusal would have
  been invisible — the same shape of bug as [[GUI-065]] — and it would have
  overwritten the `downloaded` phase, removing the banner and stranding an
  update still on disk. Now returned through IPC instead.
- **Claimed "typecheck clean" in the PR when it was not.** The root `typecheck`
  script does not reach the GUI workspace and vitest does not typecheck, so four
  `McpSessions` literals missing `pids` survived a green rail until
  `release.mjs` ran `typecheck -w @kanmer/gui`. Fixed in `c8b94a4`; the gap in
  the rail itself is listed as a follow-up on the ticket body.

## Closeout — GUI-064

- [x] PR merge verified — #29 `MERGED`, `e293df0`, 2026-08-16T15:04:51Z
- [x] proof.md finalised (PR URL + merge date appended)
- [x] Moved to final stage
- [x] Outcome recorded in ticket body
- [x] `git worktree remove .worktrees/gui-064`
- [x] branch `gui-064-installer-lock` deleted, local (`-D`, squash-merge) and on origin
- [x] `git fetch --prune` + `git worktree prune`
- [x] `take_ticket action: "release"`
