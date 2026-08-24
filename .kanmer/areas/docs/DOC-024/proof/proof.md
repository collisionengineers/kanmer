# Verification proof — DOC-024

## Merged target

- PR [#252](https://github.com/collisionengineers/kanmer/pull/252) merged normally at `6e8be9f522f9ba622c1d0c5c5e5604ad5fc2a789` on 2026-08-24T23:39:10Z. Its head was `fc46f34294d64c50c8d464aa364397bfd37a20ab`.
- Required hosted checks passed before merge: `verify` (run 32789894361, job 97630069778) and `kanmer-gate` (same run, job 97630068194).
- A fresh GitHub-origin `main` clone resolved `HEAD` to the exact merge SHA. `git merge-base --is-ancestor 6e8be9f522f9ba622c1d0c5c5e5604ad5fc2a789 HEAD` exited 0; final `git status --porcelain` was empty.

## Merged-main evidence

| Check | Result |
|---|---|
| Merge scope | PASS — after fetching the merge parent, `git diff --check <merge>^ <merge>` exited 0 and `git diff --name-only <merge>^ <merge>` named only `apps/gui/release-notes.md`. |
| Focused prerequisite | PASS — clean-clone `npm ci --ignore-scripts` exited 0 (npm reported 13 audit advisories); `npm run build -w @kanmer/core` exited 0. |
| Focused release-notes test | PASS — `node --test scripts/release-notes.test.mjs` exited 0, 1/1 passing. |
| Required v0.3.7 wording | PASS — read-only contract probe confirmed the top `0.3.7` section names `Kanmer-Setup-<version>.exe`, `latest.yml`, continued rejection of missing/mismatched/mixed artifacts, and the non-publishing/no-create-or-repair workflow boundary; it contains no v0.3.6-success assertion. |
| Release safety | PASS — DOC-024 ran no release/publisher/tag/GitHub Release/upload/repair/workflow mutation. v0.3.4, v0.3.5, and v0.3.6 records were not touched. |

## Preserved verification limitations

- The first depth-1 clean clone could not resolve `<merge>^`; the one-file diff commands exited 128 with `unknown revision`. This was a clone-history limitation, not a source failure. `git fetch --depth=2 origin main` exited 0, after which the exact same read-only scope checks passed.
- The first ad-hoc prose probe exited 1 because it demanded a literal phrase across a Markdown line wrap between `GitHub` and `Release`. The corrected probe normalised whitespace and required the same complete semantic phrase; it exited 0. The initial inspection exit is retained here and does not replace the documented source/test evidence.

This proves the merged one-file v0.3.7 notes meet DOC-024 and FRD-021’s release-note contract: deterministic future Windows artifact naming, strict verification retained, and tag-triggered verification non-publishing. It does not claim any release has been published or updated, and it does not authorize CORE-101 to start before its separate execution gate.
