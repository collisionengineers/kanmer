## ADR renumber (second collision cleanup)

`ADR-0013-staleness-by-content-not-version.md` renumbered to `ADR-0014` on
`chore-renumber-adr-0014-and-guard` (this ticket's ADR merged second, after
GUI-079's ADR-0013-hosts-own-their-registration-file). `refs` here still points
at the old path — `update_item`'s refs validator checks the file exists under
the main checkout, and it only exists on the rename branch until merge (same
situation this ticket's own `link_doc` hit — see scratch/execute.md). Will be
flipped to `docs/architecture/adr/ADR-0014-staleness-by-content-not-version.md`
once `chore-renumber-adr-0014-and-guard` merges.
