# v0.3.5 authorized publisher — failed attempt

- Target merged main / release commit: `8a4b7d982b0c94c71a843782d0b6fb1db160025e` (PR #247).
- Preflight PASS: fresh normal clone on clean `main` at that exact SHA; all shipped release manifests and release notes reported `0.3.5`; remote tag and GitHub Release were absent.
- One publisher invocation was made, with `GH_TOKEN` only in the publisher process and `KANMER_ROOT` set to the canonical board root:
  `npm run release -- 0.3.5 --publish --release-commit 8a4b7d982b0c94c71a843782d0b6fb1db160025e`
- Publisher exit: `1`. Before the failure, its local verification rail passed: core 310/310, GUI 468/468, MCP HTTP 102/102, scripts 99/99, typechecks, docs, MCP smokes, MCPB and plugin checks.
- The publisher created and pushed immutable tag `v0.3.5` at `8a4b7d982b0c94c71a843782d0b6fb1db160025e`.
- Failure: electron-builder refused the packaged app because `app.asar` did not contain `out/main/index.js`. The publisher's prescribed follow-on updater-package check also failed because the incomplete package lacked `latest.yml` and `win-unpacked/resources/elevate.exe`.
- Read-only post-failure state: tag query exit `0` and resolves to the SHA above; GitHub Release query exit `1` (`release not found`); publisher clone status clean.
- No retry, manual tag/release/asset repair, asset verifier, or downstream stage change was performed. CORE-098 remains Verifying; proof, Done, and closeout remain intentionally untouched.
