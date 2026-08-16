# Release notes

The **top section names the version being released**. `scripts/release.mjs`
refuses to publish unless this file mentions that version, which is the guard
against shipping the previous release's notes. electron-builder reads this file
from the app directory (`projectDir` is `apps/gui` when the packer is invoked
there) and uses it as the GitHub release body.

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

First published release. `0.1.0` was built and packaged but never actually
published to GitHub Releases — this is the first version any installed client
can see. Includes the Kanban board, the MCP server shipped inside the app for
agent integration (codex, Claude, any MCP client), and the self-updater
(GitHub Releases feed, update banner, restart gated on unsaved work and live
agent sessions).

## 0.1.0

First packaged release: the Kanban board, the MCP server shipped inside the app,
and the auto-updater.
