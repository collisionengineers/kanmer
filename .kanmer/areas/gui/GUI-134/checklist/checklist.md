# Checklist — GUI-134

- [x] [pre-review] Extend the typed remoteCreateSecret API with expectedConfigGeneration. (Already present on origin/main.)
- [x] [pre-review] Forward expectedConfigGeneration as the third preload IPC argument.
- [x] [pre-review] Pass the current generation from Create token and Rotate token. (Already present on origin/main.)
- [x] [pre-review] Add regression coverage for exact generation forwarding.
- [x] [pre-review] Run focused tests, GUI typecheck, diff check, and diff secret scan.
- [x] [pre-review] Write the post-implementation report, commit, push, open the PR, and move to Review.
- [x] [post-merge] Reproduce Save → Create token on the exact merged installed build and record proof.
