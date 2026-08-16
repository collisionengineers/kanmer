# Plan — GUI-064: Installer fails to uninstall old application files when updating

Written from `research.md` and `files.md`.

## Approach

**Stop the blocking processes ourselves, before `quitAndInstall`, and verify
they are gone — rather than hoping the installer wins a race it demonstrably
loses.**

Research established the chain from source and measurement: `: 2` is the
uninstaller aborting because `un.atomicRMDir` could not rename a file, and a
single `ELECTRON_RUN_AS_NODE` MCP server locks `icudtl.dat` and
`v8_context_snapshot.bin` against rename (0 blocked → 2 blocked → 0 blocked
across its lifetime). That process is not a child of the app, so `app.quit()`
does not take it down.

Three alternatives were considered and rejected:

- **Retry / wait longer.** `installUtil.nsh:213-240` already retries 5×1 s. Any
  wait we add duplicates a loop that has already failed.
- **Kill the app harder.** The app is not the holder in the failing window; its
  `app.asar` lock goes on quit. Irrelevant to the failure.
- **Custom NSIS scripting to name the busy file.** The busy path *is* computed
  (`uninstaller.nsh:174`) and then discarded across a process boundary, so
  recovering it means overriding `customRemoveFiles` — reimplementing the
  atomic-rename dance in NSIS. High-risk packaging surgery for a message, when
  the same message can be produced from our own pre-flight, in TypeScript, with
  tests. **Rejected for this ticket** and recorded as such.

What we own instead: the moment before `quitAndInstall`, where we already know
how to enumerate exactly these processes (`mcpSessions()`), already show them to
the user, and already have their consent to close them. We turn a race into a
precondition — and when the precondition cannot be met, we refuse *with the
reason*, so the user never sees a bare `: 2` again.

Reusing the existing `mcpSessions` predicate matters: it is deliberately narrow
(`kanmer-mcp.cjs` **and** path under `$INSTDIR`) and deliberately fails open.
Widening it to "anything under `$INSTDIR`" would kill the running app.

## Governing docs

**`docs/functional/frd/FRD-021-auto-update.md`**

- **Meets R4** — *"MCP registrations point at the installed executable path;
  updates preserve that path's validity."* This is the requirement currently
  violated: the update does not apply at all. Steps 3–5 restore it.
- **Meets R2** — *"Restart is gated on unsaved editor work and live agent MCP
  sessions."* The gate stays exactly where it is (renderer, before the IPC
  call). Step 6 corrects only its wording, which will otherwise describe
  something that no longer happens.
- **Meets the as-built gap it names itself** — *"the end-to-end two-version
  install cycle has not yet been run on a real build."* Step 9 runs it, and that
  run is the proof.
- **Modifies — narrative only, no requirement text.** The as-built section
  (`:42-44`) and AGENTS.md gotcha 10 / §11 both assert *"We cannot prevent
  it."* After this ticket that is half true: we cannot stop NSIS from killing
  processes under `$INSTDIR`, but we can stop the *install* from failing because
  of one. Step 10 amends those notes to say what is true. **No requirement (R1–
  R4) changes**, so this needs no authorization beyond the ticket — flagging it
  explicitly so review can check that claim against the diff.
- **No new ADR.** Nothing here is an architectural decision; it is a missing
  precondition. The decision that *would* need an ADR — moving the MCP server
  out of `$INSTDIR` — is deliberately not taken here (see Risks).

## Steps

1. **Answer the respawn question first — it can invalidate steps 3–5.**
   Kill the live MCP server pid and observe whether the agent host starts a
   replacement under `$INSTDIR`, and how quickly. If it respawns in under a few
   seconds, a one-shot kill is not enough and step 4 must hold processes down
   across a bounded window rather than killing once. **Do this before writing
   code**; record the timing in the checklist's progress notes.

2. **Carry pids through the parser** (`shared/mcp-sessions.ts`).
   Add `ProcessId` to the CIM `Select-Object` in `main/mcp-sessions.ts:23-26`
   (it currently selects only `ExecutablePath,CommandLine`) and surface pids on
   `McpSessions`. Keep the existing narrowing and the fail-open `unknown: true`
   behaviour untouched — pids are additive.

3. **Add `stopMcpSessions()`** (`main/mcp-sessions.ts`).
   Force-terminate the enumerated pids using the repo's existing Windows
   idiom — `taskkill /pid <id> /T /F`, as `dispatch.ts:51-63` does and for the
   same reason (a bare kill orphans grandchildren) — then **re-probe** and
   return `{ stopped, remaining }`. Bounded retry loop sized by step 1's
   finding. Take the executor as an injectable parameter (defaulted), following
   `dispatch.ts:38-43`, so this is testable without killing real processes.
   Inert off Windows and unpackaged, matching `probeApplies()`.

4. **Make the install path a precondition** (`main/updater.ts`).
   `installUpdateNow` becomes async: `stopMcpSessions()` → if `remaining` is
   empty, `quitAndInstall(true, true)`; otherwise **do not install** and return
   the remaining sessions. Its existing comment (`:187-198`) — that nothing can
   run after `quitAndInstall` because the installer is spawned before
   `app.quit()` — is exactly why this goes before the call, not inside it.

5. **Surface refusal to the user** (`main/index.ts:828-836`, renderer).
   The `CH.installUpdate` handler returns the result instead of `void`; a
   refusal reaches the user as an error naming the processes still holding the
   install directory and what to do about them. A refusal must leave the app
   running and the update still staged — nothing is lost, it is retryable.

6. **Fix the quit path too** (`updater.ts:208-249`).
   `maybeBlockQuitForUpdate` is the second entrance to the same install and is
   **synchronous** (`before-quit` cannot await). Use the `execFileSync` idiom
   already established by `mcpSessionsSync` (`:67-70`). If sessions cannot be
   cleared here, set `autoInstallOnAppQuit = false` and let the app quit
   cleanly rather than quitting into a failing install.

7. **Correct `restartWarning`** (`renderer/src/lib/update.ts:50-68`).
   It tells the user the *installer* will close their sessions. After this
   change we close them, deliberately, first. Pure and vitest-covered, so the
   wording is pinned by a test.

8. **Tests.** Parser pid extraction including malformed/absent rows;
   `stopMcpSessions` with an injected executor for the clear / partial / nothing-
   to-do / respawn cases; `restartWarning` wording; the handler's refusal shape.

9. **Run the two-version cycle for real** — the step that actually proves it.
   Build, install the current version, start an agent MCP session against it,
   publish/serve a newer version, and take the update. Expected: it completes.
   Then repeat with a holder we cannot kill (a hand-started
   `ELECTRON_RUN_AS_NODE` process outside our predicate) and expect a **named
   refusal**, not `: 2`.

10. **Docs.** FRD-021 as-built notes, AGENTS.md gotcha 10 and §11's limitation
    bullet, `apps/gui/release-notes.md`.

## Verification

`proof.md` is produced from step 9 — nothing else can prove this, because the
failure exists only in a packaged two-version install cycle.

- **Command log** — `npm test` (gui), `npm run typecheck`, `npm run dist:check`.
- **Command log** — the pre/post lock probe from research, re-run around the
  install: `renameable: N  blocked: 0` with sessions stopped, against the same
  three files (`icudtl.dat`, `v8_context_snapshot.bin`, `resources\app.asar`)
  that blocked at `blocked: 3`. The research scripts in
  `scratchpad/instdir-probe2.ps1` and `runasnode-probe.ps1` are the instrument;
  decide during implementation whether one of them earns a home in `scripts/`.
- **Visual** — the refusal dialog naming a process, since a message a user reads
  is the deliverable of half this ticket.
- **The negative case matters as much as the positive one.** An update that
  succeeds proves the kill works; only the refusal proves we stopped shipping
  `: 2`.

No core change, so `plugin:build` / `plugin:check` are not implicated.

## Risks / open questions

- **Respawn defeats a one-shot kill.** The top open question, and step 1 exists
  to answer it before the design depends on it. Mitigation is a bounded
  hold-down loop; if the host respawns indefinitely, the honest outcome is a
  refusal telling the user to stop their agent — which the plan already
  supports.
- **We are now force-killing user processes.** Narrowed by the existing
  predicate, gated behind an explicit install action the user already consented
  to, and never on a timer. The predicate must not be widened; review should
  check that specifically.
- **A holder we do not own (antivirus mid-scan) can still lock the same files.**
  Unfixable from here. The plan's answer is that it produces a named refusal
  rather than a bare error code — the pre-flight probe sees the lock without
  needing to know who holds it.
- **The real fix is not in this ticket.** AGENTS.md §11 already names it:
  ship the MCP server outside `$INSTDIR`, or behind a shim that survives
  updates. That ends both this failure and the "every update kills your agents"
  behaviour FRD-021 currently accepts. It is a packaging + registration change
  across every provider in `connect.ts` and needs its own ADR. **Raised for the
  user in `open-questions.md`; this ticket manages the symptom.**
- **Proof needs two real builds and a live agent session.** Slower than a unit
  test and not automatable in CI. Budget for it rather than substituting a
  cheaper check — FRD-021 has an as-built note precisely because this was
  skipped once.
