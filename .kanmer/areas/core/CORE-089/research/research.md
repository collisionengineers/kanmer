# CORE-089 research

The fresh CORE-026 review found that PR #163 is based on an older cumulative parent and its exact diff deletes GUI-109 group-menu files. The branch must be rebased or otherwise reconciled onto current `main` before any merge claim. Hosted run `32598710721` is red (core cleanup races and a stale gate snapshot); that failure must remain recorded while a fresh exact-head run is obtained after the source remediation chain is complete.
