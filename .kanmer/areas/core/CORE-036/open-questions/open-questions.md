# Open questions — CORE-036

All implementation-shaping questions are resolved by the adopted roadmap and the existing release scripts.

- [x] **Does GitHub Actions publish or repair releases?** — No. `scripts/release.mjs` remains the only publisher and repair owner. The workflow has `contents: read` and performs read-only validation.
- [x] **Which runner is authoritative?** — `windows-latest`, because `npm run dist:check` must build and inspect the real NSIS/updater artifact.
- [x] **Which tags trigger validation?** — Annotated or lightweight tags matching `v*`; the first step validates the stricter `v<semver>` shape and fails anything else.
- [x] **How is the version chosen?** — Strip the leading `v` from `github.ref_name`, then assert root, GUI and both plugin manifest versions equal it before building.
- [x] **How is the publisher race handled?** — Poll the existing read-only verifier for a bounded period. Exit 2 stops immediately as an execution failure; exit 1 may be retried until the deadline and then remains a hard failure.
- [x] **What authentication is used?** — The read-only GitHub job token, exposed only to the verifier step and never printed.
- [x] **How is the negative path proven safely?** — Use a temporary tag and intentionally incomplete draft release in a disposable fork/test repository, capture the failed job, then delete the test release/tag. Do not damage or rewrite a production Kanmer release.
- [x] **Can the workflow inline CORE-031's verify steps?** — No. If `npm run verify` is absent, stop and report that CORE-031 has not landed.

## Parked (explicitly deferred)

None.
