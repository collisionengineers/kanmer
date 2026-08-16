# Open questions — GUI-064

**All resolved 2026-08-16.** Answers 1 and 3 came from the operator; 2 and 4 were
settled by what shipped and are recorded here rather than left to be inferred.
This document was reviewed after the ticket had already closed — see [[SKILL-012]],
which exists to stop that happening again.

- [x] **Does the agent host respawn a killed MCP server, and how fast?** This
      decides whether stopping sessions is *sufficient* or merely *necessary*.
      If Claude Code (or Codex, or opencode) supervises its MCP servers and
      restarts one within the seconds between our stop and `un.atomicRMDir`, the
      lock returns and the install fails anyway — and the fix has to hold the
      processes down, not just kill them once.
      **Test, cheap and decisive:** kill the live MCP server pid and watch
      whether a new one appears under `$INSTDIR`, and how long it takes.
      → **Never measured.** The instrumentation line in the run script had a
      PowerShell syntax error and printed nothing; proof.md records this. The one
      observation available: after the kill the lock count was 0 and the agent
      host did not bring the server back, so no respawn occurred *in that
      instance*.
      → **Resolved by the operator: fold into [[MCP-005]], do not measure.**
      What shipped does not depend on the answer — `stopMcpSessions()` runs 3
      bounded rounds with a 700 ms settle, re-probes each round, and fails
      closed; both outcomes are unit-tested. MCP-005 moves the server out of
      `$INSTDIR` entirely, which removes the root cause rather than racing it,
      so the timing number would inform nothing that survives it.

- [x] **Which failure does the user see if we stop sessions and the install
      still fails?** An unrelated holder — antivirus mid-scan on a freshly
      quit binary — locks the same three files and nothing we do prevents it.
      Decide the contract before coding: refuse to start with a named reason, or
      proceed and let NSIS produce `: 2` again.
      → **Answered by implementation: refuse, with a named reason.**
      `refusalMessage()` names the projects still running and what to do about
      it, returned as an **IPC return value** rather than `emit({phase:"error"})`
      — deliberately, because an error phase would overwrite `downloaded`,
      remove the banner and strand an update still sitting on disk. `: 2` never
      reaches a user bare.

- [x] **Do we tell the user their agents are being closed, or just close them?**
      Today `restartWarning` warns that the *installer* will close sessions, and
      the user consents to that. If we start closing them ourselves the consent
      is still there but the sentence is a lie. The real question is whether
      stopping sessions ever happens without an explicit user action —
      specifically on the **quit path** (`maybeBlockQuitForUpdate`), where the
      user chose "Install and quit" hours earlier.
      → **Resolved by the operator: the existing consent is enough; change
      nothing.** "Install and quit" plainly implies closing things, and the
      install cannot succeed otherwise. The wording stands as shipped.

## For the user

- [x] **Should the MCP server move out of `$INSTDIR`?** AGENTS.md §11 already
      names this as the real fix — *"a separate binary outside `$INSTDIR`, or a
      launcher shim that survives updates"*. It removes the root cause instead of
      racing it, and it also ends the "every update kills your agents" behaviour
      that FRD-021 currently accepts as unavoidable.
      → **Answered by action: filed as [[MCP-005]]**, now in HZN-003 (0.3.3).
      The answer was "file it now"; nobody recorded it at the time, which is why
      this line reads as a correction rather than a decision.

## Parked (explicitly deferred)

- ~~**The v0.3.0 → 0.3.1 update on this machine.**~~ **Closed.** Superseded — the
  machine went 0.3.0 → 0.3.2 directly, and that run *was* the first real test of
  the fix. Residue: the stale `Kanmer-Setup-0.3.1.exe` (~78 MB) still sits in
  `%LOCALAPPDATA%\@kanmergui-updater\pending\` and is older than what is
  installed. Safe to delete; nothing depends on it.

- ~~**`.claude/skills/kanmer-research/assets/` still ships `impact-template.md`
  while the plugin ships `files-template.md`.**~~ **Closed — not a defect.**
  [[SKILL-011]] research F0 establishes that `.claude/skills/` is gitignored
  (`.gitignore:41`) and is an *install artifact*, not source. The whole tree is a
  stale v2-era install, of which the template name is one symptom. Re-running
  Connect fixes it. No Skills-area ticket is warranted, contrary to what this
  entry proposed.
