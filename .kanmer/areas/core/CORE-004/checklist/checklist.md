# Checklist

- [x] `parseDocPath` with per-segment validation and the unknown-folder message
- [x] bare type resolves to the folder index
- [x] recursive listing, `typeSatisfied`, `namedSatisfied`
- [x] `docCounts` and `listReferences` for item summaries
- [x] doc APIs path-based; lazy `mkdir` on write
- [x] scratch relocated to `scratch/<slug>.md`
- [x] checklist progress sums across every checklist document
- [x] tests: nested round-trip, one-file creation, exempt folders, traversal, unknown folder
