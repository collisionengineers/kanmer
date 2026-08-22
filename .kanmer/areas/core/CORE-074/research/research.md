# Research

CORE-071's compare/read/write still has an unavoidable TOCTOU window: a human
edit after the second read can be overwritten by `writeFile`. The safe seam is
the managed-ignore reconciliation helper in `apps/gui/src/main/kanmerGit.ts`.
An append-only merge preserves all existing lines and atomically appends only
missing or re-invalidated managed rules, so concurrent edits are never
replaced. Existing managed lines remain valid when already last; a later
negation causes one new managed rule to be appended at the end.
