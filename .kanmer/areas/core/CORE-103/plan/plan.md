# Plan — CORE-103

## Governing document

FRD-021 requires a public release whose updater assets and installed update behavior are verified.

## Execution

1. Use a fresh clean clone of the merged `main` containing DOC-025.
2. Run `npm ci --ignore-scripts` and `npm run release 0.3.8 -- --dry-run`.
3. If the dry run passes, run the repository publisher once from clean `main`, with its GitHub credential scoped to that process.
4. Record the tag target, GitHub Release, asset-verifier result, and terminal tag workflow.
5. Install v0.3.7, update to v0.3.8, and confirm GUI/MCP runtime identity after restart.
6. Write proof; any release failure remains on this ticket without retagging or creating an automatic successor.
