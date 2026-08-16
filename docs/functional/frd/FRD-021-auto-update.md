---
status: draft
covers: shipped updater (backfill)
---

# FRD-021 — Auto-update

- R1. The packaged app checks GitHub Releases; an available update surfaces as a non-blocking banner/toast reusing the in-app toast stack; "Later" is free (the update installs on the next normal quit anyway); dismissal is per-session.
- R2. **Restart is gated** on unsaved editor work and live agent MCP sessions — the app never yanks the floor out from under a working agent or an unsaved edit.
- R3. Release discipline: `release.mjs` refuses to publish unless `release-notes.md` names the version (the guard against shipping stale notes); `dist:check` verifies the packaged app can actually self-update.
- R4. MCP registrations point at the installed executable path; updates preserve that path's validity.

**Acceptance (as-built):** the updater research/plan verification list; a packaged build with a newer release shows the banner, defers restart while an agent session is live, and installs on quit.

Related: docs/plans/updater · apps/gui release rail.
