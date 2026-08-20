# Research — CORE-036: tag-push release verification

## Question

How should Kanmer independently validate a published release after a version tag is pushed, without turning GitHub Actions into a second publisher or duplicating the existing release logic?

## Findings

- The repository currently has no `.github/workflows/` release workflow. Release correctness therefore depends on the machine running `scripts/release.mjs`.
- `scripts/release.mjs` is deliberately the publisher. It verifies the tree, bumps versions, rebuilds, packages, tags, publishes, verifies assets, retries one publish repair, and then refuses on an unresolved gap. The new workflow must not repeat bumping, tagging, publishing, repair, release-note mutation, or release demotion.
- Root `package.json` exposes `dist:check`, which builds the packaged Windows application and runs `scripts/check-updater-package.mjs`. The release workflow therefore needs a Windows runner; an Ubuntu validation job cannot prove the NSIS artifact or packaged updater layout.
- CORE-031 introduces the single `npm run verify` command and shared `VERIFY_STEPS`. CORE-036 must consume that command rather than reproduce its steps in YAML. Until CORE-031 lands, implementation must stop rather than invent a temporary verification list.
- `scripts/verify-release-assets.mjs` already has a standalone CLI. It accepts a version, derives the expected installer/blockmap/manifest set from `apps/gui/release`, queries the GitHub release tagged `v<version>`, and checks upload state, size and SHA-256 digest without downloading the artifacts.
- The verifier has meaningful exit classes: `0` means integrity passed, `1` means the release is incomplete or mismatched, and `2` means the check itself could not run. The workflow must preserve that distinction in its log and final failure.
- A tag-triggered workflow can race the laptop publisher. A bounded retry around the read-only verifier is required because an initially missing asset may still be uploading. Retrying must remain read-only and must end in failure; CI must never repair the release.
- The workflow can authenticate the GitHub API with the job token while retaining `permissions: contents: read`. Supplying the token avoids unauthenticated rate-limit failures and does not grant publishing rights.
- Version identity is available from `github.ref_name`. The workflow should require `v<semver>`, strip the leading `v`, and verify that root, GUI and plugin manifest versions already equal the tag before building. A mismatch means the tag was cut from the wrong commit and must fail before expensive packaging.
- GUI-092 and GUI-093 remain the owners of single-pack and resilient-publish behavior. CORE-036 validates their result from outside; it must not absorb either fix.
- A real negative workflow test should not damage a production release. The safe proof is a temporary tag and intentionally incomplete draft release in a disposable fork or test repository using the same workflow, followed by cleanup. Unit fixtures in `verify-release-assets.test.mjs` remain the deterministic local regression rail.

## Implications

- Add one Windows tag workflow with one validation job and no publishing permission.
- Keep YAML thin: install, call `npm run verify`, call `npm run dist:check`, then invoke the existing release verifier in a bounded polling loop.
- Treat CORE-031 as an implementation prerequisite even though the board does not currently encode a blocking edge.
- Record the exact workflow/check name and failure semantics in `AGENTS.md`; branch/ruleset configuration can then refer to a stable name.
- Do not add another asset manifest, another verifier, a GitHub-release action, or a workflow-specific release script.

## Open questions

None. The MASTERPLAN fixes the transport, ownership and verification split; the remaining implementation choices are resolved in `open-questions.md`.
