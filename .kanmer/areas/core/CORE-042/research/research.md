# Research — CORE-042: Adapt release workflow for protected main

## Trigger and current behavior

CORE-033's independent review identified a real compatibility defect after the
repository enabled protection on exact `main`: `scripts/release.mjs` requires the
working branch to be `main`, writes the version/artifact changes, creates the
release commit and tag, then runs plain `git push` and `git push --tags`.
The first push is now refused by GitHub's pull-request + `verify` rule after
the local tree has already been mutated. CORE-033 deliberately remained a
source-free protection/playbook ticket and linked this follow-up.

## Governing contract and evidence

- ADR-0016 says GitHub required checks and branch protection remain the merge
  physics; Kanmer records readiness/evidence and is not a merge queue.
- FRD-021 R3 makes `release.mjs` the release-discipline owner and retains
  the release-notes, published-release, packaged-updater, and asset-integrity
  requirements.
- CORE-033's merged proof records exact `main` protection (PR + `verify` +
  resolved conversations, no force/delete) and explicitly defers this release
  compatibility gap to CORE-042.
- `.github/workflows/release.yml` is tag-triggered, contents-read-only,
  and verifies a pushed tag; it is not allowed to publish or repair a release.

## Chosen boundary

The release operation is split into two explicit phases without adding a board
stage or bypassing GitHub:

1. **Prepare** (the default `release <version>` command): validate the clean
   checkout and shared verification rail, create a unique `release/v<version>`
   branch from local `main`, bump manifests/lockfile, rebuild deterministic
   committed artifacts, build the GUI source, commit the complete release
   change, push only that feature branch, and open a PR targeting `main`.
   It never pushes `main`, creates a tag, or publishes assets.
2. **Publish** (`release <version> --publish`): run only from a clean local
   `main` after the PR merge, require the requested version to match the
   merged manifests, verify the release commit is an ancestor of `main`, then
   create/push the tag and run the existing one-package publish, visibility,
   updater, and GitHub asset digest checks. The tag therefore names a reachable
   merged-main commit and the tag workflow remains read-only verification.

## External boundaries

Local deterministic checks can prove branch/ref selection, clean-tree refusal,
manifest coherence, ancestry command construction, and dry-run non-mutation.
They cannot prove GitHub's live PR required-check decision, authorized merge,
publisher upload, the latest-release visibility check, or a real Windows two-version
auto-update cycle in this lane. Those remain INCONCLUSIVE until the operator
runs the post-merge publish phase and hosted tag workflow; the report must not
claim those outcomes early.

## Scope guard

Only the release command, its dependency-free flow tests, and the governing
release/operator wording change. The tag verification workflow remains
read-only, no branch-protection settings are weakened, no board-sync path is
changed, and no release is cut as part of implementation.
