# Checklist

- [ ] Create and use CORE-106's recorded worktree and branch from current origin/main.
- [ ] Add pure tests for the valid public release asset set.
- [ ] Add tests rejecting missing, duplicate, non-uploaded, wrong-version, wrong-URL, wrong-size, wrong-SHA-512, and missing-digest cases.
- [ ] Implement bounded remote-coherence verification without local signed-byte identity.
- [ ] Package exactly once with Electron Builder publication disabled.
- [ ] Validate the exact local package before any GitHub Release mutation.
- [ ] Create the GitHub Release explicitly for the immutable tag and upload exactly the verified local set.
- [ ] Refuse existing-release/tag conflicts and surface partial upload failures.
- [ ] Verify uploaded GitHub digests against the same local generation in the publisher.
- [ ] Update the tag workflow to use public-set coherence mode.
- [ ] Update AGENTS.md release convention and CLOSEOUT_PLAN.md recovery sequence.
- [ ] Run targeted script tests and record exit codes.
- [ ] Run npm run test:scripts and record exit code.
- [ ] Run npm run verify and record exit code.
- [ ] Run the v0.3.9 CORE-107 release dry run and confirm it performs no remote writes.
- [ ] Write the post-implementation report and open the CORE-106 PR.
