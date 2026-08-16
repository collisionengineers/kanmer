# Post-implementation report

A group opens like a ticket does, and shows the derived truth.

**For review.** The view is reachable today only through the FilterBar's
"Open group" button, which appears once a group filter is active. That is
thin. The natural entry points - a groups list in the sidebar, or opening
straight from a card chip - are not built. The chip filters rather than opens,
which is the right default (FRD-001 G8 says "click -> filter"), but it leaves
opening a group slightly buried.

**Not built:** the shared *files* list with upload. FRD-001 G8 mentions it and
the plan for 5.2 says to reuse 4.6's upload. `context.md` is surfaced directly,
which covers the common case, but a group with several context documents has no
way to browse them from here. Deferred rather than half-built, and it should
land with GUI-010's file-upload work since they share the mechanism.
