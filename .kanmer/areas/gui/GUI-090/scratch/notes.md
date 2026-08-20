## ADR renumber (second collision cleanup)

CORE-023's governing ADR was renumbered `ADR-0013` → `ADR-0014` on
`chore-renumber-adr-0014-and-guard` (it collided with GUI-079's
ADR-0013-hosts-own-their-registration-file, merged first). This ticket's body
prose has been updated to cite ADR-0014. `refs` still points at the old
`ADR-0013-staleness-by-content-not-version.md` path — the validator checks the
main checkout and the renamed file only exists on the rename branch until
merge. Will be flipped to
`docs/architecture/adr/ADR-0014-staleness-by-content-not-version.md` once that
PR merges.

## Second renumber — a live third collision

CORE-023's governing ADR renumbered again, ADR-0014 → ADR-0015: the PR that
renumbered it to ADR-0014 (#57) merged two minutes after SKILL-013's PR #56
landed its own unrelated `ADR-0014-fix-gains-enter-review.md`, recreating a
duplicate. This ticket's body prose has been updated to cite ADR-0015 directly
(skipping ADR-0014, which was never valid on main). `refs` still points at the
original `ADR-0013-staleness-by-content-not-version.md` path pending the merge
of `chore-renumber-adr-0015-collision`; will be flipped to
`docs/architecture/adr/ADR-0015-staleness-by-content-not-version.md` once that
merges.

Closeout: PR #76 merged as a2fb9684947d0d3105255b3d300da4dd2726c7d1; all discovered ticket docs reread; merged-main core/build/GUI proof passed; clean worktree and local branch removed.
