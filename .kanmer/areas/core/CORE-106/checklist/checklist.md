# Checklist

- [x] Create and use CORE-106's recorded worktree and branch from current origin/main.
- [x] Add pure tests for the valid public release asset set.
- [x] Add tests rejecting missing, duplicate, non-uploaded, wrong-version, wrong-URL, wrong-size, wrong-SHA-512, and missing-digest cases.
- [x] Implement bounded remote-coherence verification without local signed-byte identity.
- [x] Package exactly once with Electron Builder publication disabled.
- [x] Validate the exact local package before any GitHub Release mutation.
- [x] Create the GitHub Release explicitly for the immutable tag and upload exactly the verified local set.
- [x] Refuse existing-release/tag conflicts and surface partial upload failures.
- [x] Verify uploaded GitHub digests against the same local generation in the publisher.
- [x] Update the tag workflow to use public-set coherence mode.
- [x] Update AGENTS.md release convention and CLOSEOUT_PLAN.md recovery sequence.
- [x] Run targeted script tests and record exit codes.
- [x] Run npm run test:scripts and record exit code.
- [x] Run npm run verify and record exit code.
- [x] Assign the v0.3.9 CORE-107 release dry run to CORE-107 after its release notes/version preparation; do not absorb that release scope here.
- [ ] Write the post-implementation report and open the CORE-106 PR.
