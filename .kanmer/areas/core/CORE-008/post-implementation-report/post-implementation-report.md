# Post-implementation report

Groups exist, kind-typed, with derived membership.

**For review:** `deriveMembers` loads the full item list on every `getGroup`.
That is O(items) per call and fine at board scale, but the Phase 5 group view
will call it alongside a board render — if that shows up, the fix is to derive
once per render and pass the list in, which the pure signature already allows.

`updateGroup` compares serialised output and skips the write when nothing
changed, mirroring `updateItem`'s no-op rule, so a redundant patch does not bump
`updated` or wake the watcher.

**Not built here:** the label→group conversion (that is kanmer-groom, SKILL-007)
and the GUI surface (GUI-013/GUI-014). This is the entity and its tools.
