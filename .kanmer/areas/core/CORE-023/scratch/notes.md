## ADR renumber (second collision cleanup)

`ADR-0013-staleness-by-content-not-version.md` renumbered to `ADR-0014` on
`chore-renumber-adr-0014-and-guard` (this ticket's ADR merged second, after
GUI-079's ADR-0013-hosts-own-their-registration-file). `refs` here still points
at the old path — `update_item`'s refs validator checks the file exists under
the main checkout, and it only exists on the rename branch until merge (same
situation this ticket's own `link_doc` hit — see scratch/execute.md). Will be
flipped to `docs/architecture/adr/ADR-0014-staleness-by-content-not-version.md`
once `chore-renumber-adr-0014-and-guard` merges.

## Second renumber — a live third collision

The ADR-0014 rename above (`chore-renumber-adr-0014-and-guard`, PR #57) merged
at 00:11:28, two minutes after SKILL-013's PR #56 merged its own new
`ADR-0014-fix-gains-enter-review.md` at 00:09:44 — both read `origin/main` as
of the same prior commit and both allocated ADR-0014, so #57 landing on top
recreated a duplicate immediately. Following the same "merged second
renumbers" rule, this ticket's ADR is now `ADR-0015-staleness-by-content-not-version.md`
(branch `chore-renumber-adr-0015-collision`). `refs` here is still
`ADR-0013-...` pending the merge of that follow-up PR (refs validation checks
the main checkout, and the renamed file only exists on the branch until then)
— will be flipped straight to `ADR-0015-staleness-by-content-not-version.md`
once it merges, skipping ADR-0014 entirely since that path was never valid on
main.
