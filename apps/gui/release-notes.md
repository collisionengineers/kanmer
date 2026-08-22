# Release notes

The **top section names the version being released**. `scripts/release.mjs`
refuses to publish unless this file mentions that version, which is the guard
against shipping the previous release's notes. electron-builder reads this file
from the app directory (`projectDir` is `apps/gui` when the packer is invoked
there) and uses it as the GitHub release body.

## 0.3.3 (unreleased — notes accumulating)

### Grok Connect uses the native Kanmer plugin

Grok Connect now preflights the CLI and Node runtime, installs the user-scoped
`kanmer` plugin, verifies it with `grok inspect`, and then retires only legacy
Kanmer state under `.grok/`. It no longer copies skills or writes a project MCP
registration. Connect and Disconnect warn that this plugin scope affects all
Grok workspaces for the current user.

### Windows repairs restore Kanmer's stable MCP launcher

The Windows installer now owns a stable per-user MCP launcher. Repairing or
reinstalling Kanmer refreshes that launcher even when Kanmer itself lives in a
custom installation directory. This is the installer foundation only: portable
Codex registration arrives separately, so existing provider registrations are
unchanged in this release.

### A `fix` now goes through Review

A `fix` used to be able to go straight from Implementing to Done in one move,
skipping Review and Verifying entirely — as could `chore` and `spike`. That was
never a decision; it fell out of how the anti-collapse rule counts gated
boundaries, and `fix` is the **default** profile, so it is what most tickets
quietly got.

A fix big enough to open a PR is big enough to be looked at. `fix` now asks for
a **post-implementation report** on the way into Review, exactly as `feature`
does. `chore` and `spike` are unchanged and still reach Done in one jump — a
rename does not need a review, and a spike's research *is* the deliverable.

**If you are upgrading a board with a `fix` in flight, read this.** The rule
applies to existing boards, not only new ones. A `fix` sitting in Implementing
cannot move to Review or beyond until it has a post-implementation report. The
fix is to write one — one document, and the refusal names it. If its PR has
already merged, it still needs the report before Done: the report is the record
of what shipped, and a merged change with no such record is the thing this
change exists to prevent.

A `fix` walked one stage at a time is otherwise unaffected — every single-stage
move it could make before, it can still make.

### Open questions now block a ticket, instead of being advice

A ticket's `open-questions` document has always said its questions "block the
plan". Nothing enforced it, and the result was exactly what you would expect:
every ticket on this project that ever raised a question reached Done — or was
archived — with the question still sitting there unticked.

Now a question is a real gate. While `open-questions` holds an unticked
`- [ ]`, the ticket cannot leave Preparing, cannot enter Review, and cannot
reach Done. Two ways to clear it, and both are honest:

- **Answer it** and tick the box.
- **Park it** — move it under `## Parked (explicitly deferred)` with a reason.
  Everything below that heading is not counted.

A ticket with no `open-questions` document is never blocked. Raising no
questions is not a failure state.

**If you are upgrading a board with work in flight, read this.** The rule
applies to existing boards, not only new ones — so a ticket sitting in Preparing
with an unticked box becomes unmovable the moment you upgrade. That is
deliberate; the fix is one line in a document you already have. Tick it, or park
it with a reason.

Nothing records *who* answered a question. Kanmer is for one developer, and
where it is not, the commit that ticks the box already has a name on it.

### Backlog is the board's first column again

The board used to render **BACKLOG after DONE** — the not-started column sitting
past the finished one, which is the exact opposite of how a kanban reads.

Nobody chose that. The column had been deliberately removed from the board, but
the code that appends a column for an *unrecognised* status could not tell
"nobody configured this" apart from "this was configured and then hidden", so
every board holding a backlogged ticket got the column straight back — at the
end, labelled with its raw id. The removal was undone by the same change that
made it.

Backlog is now a real column, first, in stage order, styled like every other
stage, and it stays put whether or not anything is in it — no column appearing
and disappearing as the count crosses zero. Dragging a card back into Backlog
works, and so does Ctrl+← out of Preparing, which previously flung the card to
the far right of the board. A genuinely unknown status still gets its own
column at the end, which is what that fallback was always for.

### Also

`kanmer-auto` can now be pointed at an epic or a horizon, not only an area —
"clear HZN-003" resolves the roster itself instead of you listing ticket ids.

## 0.3.2

Fixes updates that could fail to install.

If you have seen **"Failed to uninstall old application files. Please try
running the installer again.: 2"**, this is that. Running the installer again
did not help, which is the most annoying part of the message.

### What was wrong

An agent's MCP server runs *as the installed Kanmer executable* — that is how
your agent talks to the board without needing Node installed. It is not a child
of the app, so closing Kanmer does not close it, and it keeps two of Electron's
data files open in a way that stops the installer replacing them. The installer
tries to close such processes itself, but it races its own file replacement and
sometimes loses, and it gives up after five seconds.

Closing Kanmer looked like it should be enough. It was not, and nothing on
screen said so.

### What changes

Kanmer now closes agent MCP sessions itself before starting an update, and
checks they are gone. If they cannot be closed, **the update does not start** —
you get a message naming the projects still holding the folder, the app keeps
running, and the download stays on disk so you can close those agents and hit
restart again. No more bare error code from the installer.

The confirmation before "Restart and update" is unchanged: it still tells you
which sessions will close, and nothing installs without you asking.

## 0.3.1

Fixes migrations that could fail part-way on Windows and then refuse to finish.

**If a 0.3.0 migration left your board half-migrated, install this and run
Migrate again.** It will pick up where it stopped rather than starting over,
and it clears any stray files the failed run left behind.

### What was wrong

Windows fails a file rename with `EPERM` whenever anything else has the file
open — a virus scanner reading it, the search indexer, a background `git`. On a
single write that is rare. Across a few hundred tickets it is close to certain.

The migration did not retry, so one scanner read aborted the whole run. Worse,
a re-run started from the beginning and rewrote every ticket it had already
converted, taking a fresh chance of the same failure on each one — so each
attempt tended to fail *earlier* than the last.

### What changed

- **Writes retry.** A blocked rename is retried briefly instead of failing
  outright, and never leaves a temporary file behind.
- **Migration resumes per ticket.** Tickets already converted are skipped, so a
  second run does only the work left. A board that stopped at ticket 200 of 242
  now finishes the last 42 instead of redoing all 242.
- **The app stops competing with itself.** Kanmer now pauses its own file
  watcher and Git sync while a migration runs — previously it read every file it
  was writing, which was part of the contention causing the failure.
- **Stray files are cleaned up.** Leftovers from an interrupted run are removed
  during the next migration, and are no longer committed by Git sync.

Verified against a real 242-ticket board that had failed three times: it
completes, skips the 194 tickets already done, finishes the remaining 48, and a
second run is a clean no-op.

### Note

If your board is still on format 2 it stays read-only until the migration
finishes — that is deliberate, and Migrate remains available while it is.

## 0.3.0

**Kanmer v3.** The board format changes, and existing boards are migrated on
open — see *Upgrading* below before installing.

v2 asked every ticket for the same documents. A two-line fix owed the same
research, plan, checklist and report as a month of work, so tickets either
stalled at a gate or picked up documents written to satisfy one. v3 fixes that
by making the requirements a property of the ticket rather than of the board.

### Requirement profiles

Each ticket carries a **profile** that decides what each stage boundary asks of
it. `feature` owes research, files, a plan, a checklist, a report and proof.
`fix` owes files, a plan and proof. `chore` owes a plan and proof. `spike` owes
research alone and can go straight to Done. `custom` carries its requirements
inline.

Ask `get_doc_gates` what a given ticket needs — never assume a pipeline. If the
gates feel heavy for a small change, the profile is wrong; change the profile.

Edit profiles, per-area defaults and the proof vocabulary in **Settings →
Profiles**. Saving tells you how many tickets the change re-gates before you
commit to it.

### Six fixed stages

**Backlog → Preparing → Implementing → Review → Verifying → Done**, the same on
every board. Custom stage sets are gone: they used to leave document gates
pointing at stages that did not exist, silently doing nothing.

**A move crosses at most one gated boundary.** Writing every document and
jumping Backlog → Done in a single step is refused even when nothing is missing
— the pipeline is meant to be walked, not satisfied at the end. The refusal
names the next stage.

### Backlog is a list

The board drops its Backlog column. A column is for work in flight, where seeing
every card matters; a backlog is a queue you scan, sort and triage. The new view
is a sortable, windowed table with bulk actions — move, group, archive — and a
bulk move reports which tickets could not go and why.

### Groups

Tickets can belong to **epics** and **horizons**. Membership lives on the
ticket, so a group's members and its progress are always derived and can never
disagree with reality. A group holds shared context once, where every member's
agent reads it, instead of repeating it per ticket.

### Documents are folders

`research/`, `plan/`, `proof/` and the rest hold as many files as the work
needs. `reference/` holds inputs you attach — mockups, specs, logs — and is
never able to satisfy a gate. Attach files by dropping them on a ticket.

Proof can be typed (`proof:visual@staging`), and a visual proof with no
screenshot raises a warning rather than blocking.

### Task-scoped dispatch

Dispatch now hands a background agent **one deliverable** — map the files, write
the plan, run the verification — and it stops when that exists. The menu shows
what each task produces and greys out the ones that cannot run yet, with the
reason.

### In-app manual

**F1** or **Help → Manual**: chapters, search, and `?` links from each Settings
tab. Generated at build time and compiled in, so it works offline.

### Also

- Renaming the shared board branch now moves it instead of stranding its
  history, and migrates projects that were closed at the time.
- Priorities are removed. Ordering is the board's manual order.
- Twelve agent skills, rewritten for v3; `kanmer-import` is gone and setup is
  now a re-runnable reconcile rather than a one-time mode.
- Kanmer's own board runs on v3 — 40 roadmap tickets plus 60 backfilled from
  the repository's history.

### Upgrading

Opening an older board offers the migration and shows exactly what it will do —
stage mapping with counts, any ticket it cannot map, documents relocating, and
the fields being dropped. Nothing changes until you accept. **Until you migrate,
the board is read-only**: v3 shapes written into a v2 board would leave one
neither version reads correctly.

If you run an agent with its own long-lived MCP server, restart it after
updating. It holds the version it started with.

## 0.2.0

- Added **Settings → Dispatch** for machine-local provider model defaults,
  per-task overrides, and append-only operator instructions. Empty settings
  preserve existing provider commands and built-in task prompts.

First published release. `0.1.0` was built and packaged but never actually
published to GitHub Releases — this is the first version any installed client
can see. Includes the Kanban board, the MCP server shipped inside the app for
agent integration (codex, Claude, any MCP client), and the self-updater
(GitHub Releases feed, update banner, restart gated on unsaved work and live
agent sessions).

## 0.1.0

First packaged release: the Kanban board, the MCP server shipped inside the app,
and the auto-updater.
