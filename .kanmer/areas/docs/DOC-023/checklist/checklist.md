# Checklist — DOC-023

- [ ] Add the accurate `## 0.3.6` release-notes entry above v0.3.5.
- [ ] Confirm the wording distinguishes pre-tag publisher GUI build from non-publishing tag verification and makes no public-release claim for v0.3.4/v0.3.5.
- [ ] Run `node --test scripts/release-notes.test.mjs` and record its exit code.
- [ ] Run `git diff --check` and inspect the one-file diff/name-only range.
- [ ] Commit the one-file change, push the ticket branch, and open a PR containing `Kanmer: DOC-023`.
- [ ] Write the post-implementation report with changed-file, FRD, risk, and verification hand-off.
- [ ] Move DOC-023 to Review and stop for an independent reviewer.

## Progress notes
