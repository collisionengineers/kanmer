# Open questions — GUI-064

- [ ] **Does the agent host respawn a killed MCP server, and how fast?** This
      decides whether stopping sessions is *sufficient* or merely *necessary*.
      If Claude Code (or Codex, or opencode) supervises its MCP servers and
      restarts one within the seconds between our stop and `un.atomicRMDir`, the
      lock returns and the install fails anyway — and the fix has to hold the
      processes down, not just kill them once.
      **Test, cheap and decisive:** kill the live MCP server pid and watch
      whether a new one appears under `$INSTDIR`, and how long it takes. Not run
      during research because the only session available was the one driving
      this ticket. Run it first in implementation; it is step one of the plan.

- [ ] **Which failure does the user see if we stop sessions and the install
      still fails?** An unrelated holder — antivirus mid-scan on a freshly
      quit binary — locks the same three files and nothing we do prevents it.
      Decide the contract before coding: refuse to start with a named reason, or
      proceed and let NSIS produce `: 2` again. Research's position is that `: 2`
      must never reach a user bare, but "what instead" is a product decision.
      **Answerable by us**; needs deciding, not investigating.

- [ ] **Do we tell the user their agents are being closed, or just close them?**
      Today `restartWarning` warns that the *installer* will close sessions, and
      the user consents to that. If we start closing them ourselves the consent
      is still there but the sentence is a lie. Wording is cheap; the question
      is whether stopping sessions ever happens without an explicit user action
      — specifically on the **quit path** (`maybeBlockQuitForUpdate`), where the
      user chose "Install and quit" hours earlier.

## For the user

- [ ] **Should the MCP server move out of `$INSTDIR`?** AGENTS.md §11 already
      names this as the real fix — *"a separate binary outside `$INSTDIR`, or a
      launcher shim that survives updates"*. It removes the root cause instead of
      racing it, and it also ends the "every update kills your agents" behaviour
      that FRD-021 currently accepts as unavoidable. It is a packaging and
      registration change across every provider in `connect.ts`, so it is its
      own ticket and probably its own ADR. **Question for you: file it now as a
      follow-up, or is managing the symptom the right ceiling for this?**

## Parked (explicitly deferred)

- **The v0.3.0 → 0.3.1 update on this machine.** Staged and ready in
  `%LOCALAPPDATA%\@kanmergui-updater\pending\`. Deferred deliberately: running it
  kills the MCP session driving this ticket. Reopens the moment the work is done
  — and it doubles as the first real test of the fix.
- **`.claude/skills/kanmer-research/assets/` still ships `impact-template.md`
  while the plugin ships `files-template.md`.** Pre-v3 naming drift in the repo's
  own skill copy. Harmless here (the doc type is `files` and the plugin template
  is the one that matters), unrelated to this ticket, worth a Skills-area ticket
  of its own.
