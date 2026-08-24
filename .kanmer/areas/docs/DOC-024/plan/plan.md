# Plan — DOC-024: v0.3.7 release-note contract

## Approach

Make one documentation-only insertion at the top of `apps/gui/release-notes.md`. The v0.3.7 text will name the explicit deterministic Windows installer filename and its updater-manifest agreement, retain strict rejection of missing/mismatched/mixed release assets, and state that tag-triggered verification is non-publishing. This reuses the merged CORE-100 and DOC-023 facts rather than changing source, validation, or release mechanics.

## Governing docs

- **`docs/functional/frd/FRD-021-auto-update.md` — Meets.** The new heading gives `release.mjs` current-version release notes and accurately describes the existing updater artifact/manifest integrity discipline without claiming an update or public release outcome.
- **[[HZN-007]] context — Meets.** Work remains ticket-scoped, uses its dedicated worktree, preserves v0.3.6 failure evidence, stops at independent Review, and writes no proof before merge.

## Steps

1. From current protected `origin/main`, create DOC-024's dedicated worktree and branch, then record it with `take_ticket`; do not use the board worktree or a release clone.
2. Insert only the top-level `## 0.3.7` release-notes section. State `Kanmer-Setup-<version>.exe` is explicit and agrees with the updater manifest, strict asset verification rejects missing/mismatched/mixed artifacts, and tag-triggered verification remains non-publishing.
3. Inspect the diff to confirm `apps/gui/release-notes.md` is the sole changed tracked file and the text neither calls v0.3.6 successful nor promises an updater outcome.
4. Build the core prerequisite if needed, then run `node --test scripts/release-notes.test.mjs`; run `git diff --check` and record every exit.
5. Tick the execution checklist, write the post-implementation report, commit only the release-notes file, push the branch, open a DOC-024-footed PR, and move one boundary to Review. Stop for independent review.

## Verification

- `npm run build -w @kanmer/core` (only to provide the generated core artifact required by the focused script rail) exits 0.
- `node --test scripts/release-notes.test.mjs` exits 0.
- `git diff --check` exits 0 and `git diff --name-only origin/main...HEAD` names only `apps/gui/release-notes.md`.
- Manual text inspection confirms the required three factual statements and the absence of a v0.3.6-success claim, release/publish action, or source/config/workflow/version change.

## Risks / open questions

- The release-notes test does not assert the new prose verbatim; mitigate with explicit wording review and one-file diff evidence.
- A fresh worktree may lack `packages/core/dist` after `npm ci --ignore-scripts`; build the documented core prerequisite before the focused test and retain any initial exit.
- No open questions remain. A publisher, tag, GitHub Release, asset, or workflow change would exceed scope and must stop this ticket.
