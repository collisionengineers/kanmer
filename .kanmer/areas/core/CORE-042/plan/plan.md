# Plan — CORE-042: Adapt release workflow for protected main

## Objective

Make the release procedure compatible with the live protected `main` rule.
The version/artifact commit must reach `main` through an ordinary PR and the
required `verify` check. Only after that merge may the release tag and Windows
assets be published, and the tag must point at a reachable merged commit.

## Governing docs

- ADR-0016 — GitHub branch protection and required checks are the physical merge
  boundary; Kanmer does not bypass or replace them.
- FRD-021 — release discipline, published visibility, updater packaging, and
  asset-integrity verification remain mandatory.
- HZN-007 context and CORE-033 merged proof — adjacent stages, no self-merge,
  exact live protection, and the deferred compatibility finding.

## Implementation steps

1. Add a dependency-free release-flow helper or equivalent focused functions
   that distinguish preparation from publication and validate a safe semver
   version, exact `main` source, unique `release/v<version>` branch, and
   merged-main ancestry.
2. Refactor `scripts/release.mjs` so the default non-dry-run phase validates
   and runs the shared rail, creates the release branch, writes/bakes artifacts,
   commits them, pushes only the release branch, and opens a PR targeting
   `main`. It must stop before tag/publisher calls.
3. Add an explicit `--publish` phase that refuses dirty/non-main/unmatched
   manifests/unreachable release commits, then preserves the existing tag,
   single package, visibility, updater, repair, and digest verification steps.
   It must never push a branch other than the tag ref and must not force or
   delete refs.
4. Preserve `--dry-run` as a no-write preview of both phases. It must not
   switch branches, bump files, create a PR, create a tag, publish, or alter the
   working tree.
5. Add focused node:test coverage and update AGENTS/FRD-021 with the exact
   operator sequence and explicit hosted/e2e evidence boundaries.

## Acceptance checks

- No non-dry-run path executes a plain push of local `main`; prepare pushes
  only `release/v<version>` and publish pushes only `refs/tags/v<version>`.
- Prepare opens a PR whose base is exact `main` and stops before tag or
  publisher commands.
- Publish requires clean exact `main`, matching merged version manifests,
  and a release commit/ref proven ancestor of `main` before tagging.
- Existing dry-run, release-notes, token, package, updater, visibility, repair,
  and asset digest safeguards remain intact.
- Focused flow tests pass; `npm run test:scripts`, typecheck, build, and
  `git diff --check` are run with exit codes recorded.
- No live GitHub merge, tag publication, hosted release asset, or real updater
  cycle is claimed without external evidence.

## Stop condition

Stop at Review with a clean ticket branch, PR, report, checklist, exact local
rail results, and an explicit INCONCLUSIVE disposition for unavailable live
GitHub/publisher/updater evidence. Do not merge, publish a release, or clean up.
