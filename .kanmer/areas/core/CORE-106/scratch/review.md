---
kind: review-attestation
pr: "270"
head_sha: "6aee92d5bcdedf75ed9da277cfb5d23ad96ea0e3"
verdict: pass
reviewer: "codex-doc021-review"
independent: true
plan_hash: "d495e81f9d336ec4"
ticket_updated: "2026-08-25T10:45:07.146Z"
findings:
  - id: F-001
    severity: major
    summary: "The publisher made the Release latest before the explicit asset upload, allowing an upload failure to expose a partial updater release."
    disposition: fixed
  - id: F-002
    severity: major
    summary: "The documented GITHUB_RELEASE_TOKEN was accepted by preflight but was not forwarded to gh."
    disposition: fixed
  - id: F-003
    severity: major
    summary: "The release-existence probe treated every gh release view exit-1 failure as release absence."
    disposition: fixed
  - id: F-004
    severity: major
    summary: "The typed release-existence probe passed version instead of the helper's required tag argument, so it requested /releases/tags/undefined and always inferred absence."
    disposition: fixed
  - id: F-005
    severity: major
    summary: "The draft publisher could make a release public when GitHub omitted an asset SHA-256 digest."
    disposition: fixed
  - id: F-006
    severity: minor
    summary: "Tag CI treated a not-yet-public draft asset download as non-retryable exit 2."
    disposition: fixed
  - id: F-007
    severity: minor
    summary: "Remote-coherent verification used a second asset-name list that could drift from actual package outputs."
    disposition: fixed
  - id: F-008
    severity: major
    summary: "The publisher pushed the immutable tag before building and validating its one package, so a local packaging failure stranded a retry-blocking tag."
    disposition: fixed
  - id: F-009
    severity: major
    summary: "Unqualified gh release commands could honor GH_REPO and create/upload a release in a repository different from the tag and REST-verification repository."
    disposition: fixed
---
# Independent review — CORE-106 / PR #270

## Scope and evidence

Independently reviewed PR #270 at exact head `6aee92d5bcdedf75ed9da277cfb5d23ad96ea0e3` against the full CORE-106 packet, HZN-007 context, FRD-021, complete diff, current review threads, and hosted checks. The reviewer is distinct from the author role. The bounded scope is retained: a single local Windows package generation, explicit release publication, strict local and remote coherence checks, a read-only tag verifier, release guidance, and recovery documentation; no runtime updater, existing tag/release, dependency, credential, or branch-protection change is present.

Focused command `node --test scripts/verify-release-assets.test.mjs scripts/release-flow.test.mjs scripts/release-publish.test.mjs` exited 0: 62/62 passing. `git diff --check 8c8fdb868aed3677b3603b9ba360f304139aee6f...6aee92d5bcdedf75ed9da277cfb5d23ad96ea0e3` exited 0. Exact-head hosted workflow 32838765805 is green: `verify` passed at 2026-08-25T10:49:07Z (4m06s) and `kanmer-gate` passed at 2026-08-25T10:46:05Z (1m04s).

## Findings and dispositions

F-001 through F-007 remain fixed. The publisher creates a draft, uploads and digest-verifies the exact retained package before making it public/latest; token normalization and typed release lookup fail closed; digest absence is a hard error; retry classification distinguishes public visibility races from execution/authentication failures; and one canonical four-asset helper governs both local upload construction and remote verification.

F-008 is fixed at this head. All local publication prerequisites now precede any tag creation: GUI build, Electron Builder with `--publish never`, MCPB copy, packaged-updater check, local manifest coherence, and canonical exact-upload-set validation. A tag push failure deletes only the just-created local tag, refuses before any GitHub Release operation, and preserves a competing remote tag as immutable evidence. The regression pins package validation before tag push and the local-tag cleanup path.

F-009 is fixed at this head. `gh release create`, `gh release upload`, and `gh release edit` each explicitly pass `--repo collisionengineers/kanmer`, matching the tag and REST-verification target rather than ambient `GH_REPO`. The release-flow regression pins all three commands.

All nine recorded findings are disposed as fixed. GitHub review threads F-001 through F-007 are resolved; F-008 and F-009 are remediated at this head and are resolved with this decision. No unresolved review thread, requested change, or failed/pending required check remains.

## Decision

PASS. With the board review record synchronized and the post-attestation merge gate green, PR #270 may be squash-merged through the normal protected-main flow. CORE-107 exclusively owns the actual v0.3.9 release/publication and installed-runtime proof; this review neither publishes nor verifies a release.
