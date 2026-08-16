# Post-implementation report

codex registers per project, in the project.

**Beyond the FRD.** FRD-012 R1 asked for the trust caveat to be "surfaced". It
is now *checked*: Connect reports whether this specific folder is trusted, and
says nothing at all when it is. A caveat shown unconditionally is a caveat
people learn to skip.

**For review, two judgement calls.**

An unparseable `.codex/config.toml` is handled asymmetrically — merge starts
clean, unmerge returns the input verbatim. Deleting from a file we cannot parse
is the one irreversible mistake available here.

Ancestor trust is reported as a maybe. If someone later confirms how codex
resolves it, this should become a definite answer; `codexTrustFromConfig`
already distinguishes the case, so only the wording changes.

**Not done:** the Connect pane still renders the trust note as part of the
result text rather than as its own UI state. Enough to be useful, and the
Connect section's redesign is not in this ticket.
