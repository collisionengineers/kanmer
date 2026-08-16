# Post-implementation report

This board is format 3. The applied result matched the dry run exactly.

    done         -> done          5
    backlog      -> backlog      34
    researching  -> preparing     1
    needs-restage 0 · blockers 0 · priorities stripped 40
    profiles: 35 feature, 5 custom · 10 documents relocated

**Two things this run found that no fixture had.**

`repoDocs` was being dropped. The migration deleted the v2 `docs` block
wholesale, and `repoDocs` lived inside it — so the board silently reverted to
the shipped globs (`docs/prd/**`), which match nothing in a docs-template tree.
The symptom was immediate and loud in the right way: the very next `move_item`
refused, because `refs` pointing at real FRDs no longer classified as governing
docs. Fixed by lifting `repoDocs` to a top-level board key and carrying it
across, with two regression tests. **The gate caught a bug in the migration** —
which is the strongest evidence available that the gate does something.

`open-questions` had a home only because of a Phase 0.1 correction. GUI-004
carried an `open-questions.md`, and FRD-003's folder list had omitted that type
while FRD-003 T8 rejects unknown top-level folders. Had the spec gone in
unamended, this migration would have had nowhere to put that document.

**For review:** the board was migrated by calling core directly rather than
through the GUI prompt, because the prompt does not exist yet. Same function,
but the prompt's preview rendering is still unverified — that is GUI-005's job.
