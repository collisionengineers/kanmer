Settings has five tabs. This is a tour of what is in each, and where to look
when you know what you want to change but not where it lives.

## Board

**Areas.** The parts your work divides into. One row per area, each with a
colour swatch, an editable name, arrows to reorder them, and a delete that warns
you if tickets still use it. Type a name to add one.

Each area shows its id and the prefix that ticket ids in it are built from.
Neither is editable, because changing a prefix would orphan every id already
issued from it.

This tab also holds a couple of preferences for new tickets, such as which area
they default to.

Stages are not here, and there is nothing missing: the six stages are the same
on every board and cannot be changed. Priorities are not here either — Kanmer
does not have them. See **The six stages**.

## Profiles

Where you decide what a ticket owes.

A grid: one row per profile, one column per stage boundary, each cell a
comma-separated list of what that profile requires there. Below it, a default
profile per area, and the list of proof types your board recognises.

Mistakes are flagged as you type and Save stays disabled until they are fixed.
Before you save, Kanmer tells you how many existing tickets the change will
re-gate — profile changes are retroactive, and it is better to know that before
than after.

See **Profiles: what a ticket owes**.

## Appearance

Theme — light, dark, or follow the system.

**Notifications** also live here, which is slightly counter-intuitive if you
went looking in Connect. The checkbox reads *Toast when an agent changes the
board while the window is unfocused*, and it is on by default. See **Staying in
sync**.

## Git

Only useful when the project is a Git repository; Kanmer says so plainly when it
is not, rather than showing controls that cannot do anything.

- **Kanmer branch** — the name of the branch your board lives on, with a
  **Rename branch** button. Renaming happens in place and keeps the board's
  history.
- **Automatic sync** — off until you turn it on, then every N **minutes**.
- **Sync now** — sync immediately. It becomes **Retry** if a sync has paused on
  a conflict.

Under those, Kanmer shows where the board worktree is and when it last synced,
and any error from the last attempt. See **Sharing a board over Git**.

## Connect

One row per supported agent host, each with a **Connect** button that registers
this project's board with that host and installs Kanmer's skills for it.

Rows show **Disconnect** once connected, and an **Update skills** button when
the copy in your project is older than the one this Kanmer ships. If a
connection cannot be made automatically, the row shows you what to run or which
file to edit, with a **Copy** button.

See **Connect an agent**.

## Things that are not in Settings

Worth knowing so you stop looking:

- **Stages** — fixed at six, by design.
- **Priority** — does not exist. Use a horizon group and the order of cards in a
  column.
- **Adding or removing a profile**, and **which profile is the board's
  default** — these live in the board's own configuration file rather than in
  the app.
- **Creating a group** — ask a connected agent; there is no button for it yet.
