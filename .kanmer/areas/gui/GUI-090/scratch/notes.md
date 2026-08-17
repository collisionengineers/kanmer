## ADR renumber (second collision cleanup)

CORE-023's governing ADR was renumbered `ADR-0013` → `ADR-0014` on
`chore-renumber-adr-0014-and-guard` (it collided with GUI-079's
ADR-0013-hosts-own-their-registration-file, merged first). This ticket's body
prose has been updated to cite ADR-0014. `refs` still points at the old
`ADR-0013-staleness-by-content-not-version.md` path — the validator checks the
main checkout and the renamed file only exists on the rename branch until
merge. Will be flipped to
`docs/architecture/adr/ADR-0014-staleness-by-content-not-version.md` once that
PR merges.
