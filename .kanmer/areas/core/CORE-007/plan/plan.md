# Plan

One pass, in this order per ticket: documents, then frontmatter, then — once
every ticket is done — the board file, then the version stamp. The version stamp
is last so an interrupted run is still detected as format 2 and resumes rather
than declaring victory.

Every step checks before acting (`if (!(await pathExists(target)))`), so a
half-applied run finishes cleanly instead of double-moving.

Stage mapping is case-insensitive and trimmed. Anything unmatched → Backlog +
`needs-restage`, each listed by id in the report.

Profiles: active tickets get **`feature`**, done and archived get `custom` with
an empty map. The user chose `feature` over the FRD's original `fix` — in-flight
work should surface its documentation debt rather than hide it. Finished work
owes nothing retroactively, which is what makes historical backfill painless.

Dry run computes the identical report and writes nothing — the same code path,
returning early, so the preview cannot drift from what applying does.
