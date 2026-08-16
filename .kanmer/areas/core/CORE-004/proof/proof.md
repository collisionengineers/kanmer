# Proof

Branch `v3-phase-minus-1-prework` at `cb39080`.

- `research/azure/tokens.md` round-trips and satisfies the research requirement
  on its own — asserted in core and again over stdio.
- Creating a chore leaves exactly one file on disk (`readdir` of the ticket
  folder equals `[<ID>.md]`), so folders really are lazy.
- A ticket holding only `reference/`, `scratch/` and `assets/` documents
  satisfies **no** gate.
- `reserch/x.md` is rejected naming all ten valid folders; `../../escape.md` is
  rejected as an invalid segment.
- Counts are per type and recursive (2 research documents across two directories);
  reference files are enumerated by name.
- Checklist progress sums across multiple checklist documents (2/3 over two files).
- **Live:** ten documents on this repo's own board relocated into their folders
  during migration, including `impact.md` → `files/impact.md`.
