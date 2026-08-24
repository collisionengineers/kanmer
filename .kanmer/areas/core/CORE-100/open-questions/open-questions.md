# Open questions — CORE-100

## Resolved

- [x] Should the verifier accept `Kanmer.Setup.0.3.6.exe` as an alias for the expected hyphenated installer? No. The public `latest.yml` independently names the absent hyphenated installer, so alias acceptance would hide a broken updater URL and weaken the integrity boundary.
- [x] What is the smallest forward source change? Set the explicit safe Windows `artifactName`; retain verifier logic and its strict presence/state/size/digest/manifest checks.
- [x] Does CORE-100 repair the existing v0.3.6 release? No. It preserves the mixed/duplicate release evidence and records the read-only result; a future successor release is separately ticketed and governed.
- [x] Is a documentation update required? Yes. This is a public release-artifact convention, so AGENTS.md's human-owned release guidance changes with the configuration; the managed block is untouched.
- [x] May planning create a worktree, branch, PR, tag, release, upload, repair, or rerun? No. CORE-100 remains in Preparing until separately authorized execution.

## Parked (explicitly deferred)

No parked questions.
