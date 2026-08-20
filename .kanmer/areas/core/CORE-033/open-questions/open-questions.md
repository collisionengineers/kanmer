# Open questions — CORE-033

All product and policy choices are resolved by MASTERPLAN S-03. The implementation records operational values rather than deciding new behaviour.

- [x] **May protection be enabled before the Windows rail is stable?** — No. CORE-032 and GUI-085 must be done, and the real `verify` check must be green on two distinct PR head SHAs first.
- [x] **Which check is required on `main` initially?** — The exact display string observed for CORE-032’s `verify` job. Do not guess or type a check that GitHub has not posted.
- [x] **What does `main` require?** — Pull request, observed `verify` status check, conversation resolution, no force push, and no deletion. No additional policy is authorized by this ticket.
- [x] **What does `kanmer-board` require?** — No force push and no deletion only. Ordinary direct push remains allowed; no PR or status check is required.
- [x] **Should administrators or maintainers be able to bypass the rules silently?** — No. Apply/enforce the rule to the intended actors as far as GitHub permits and document any unavoidable repository-owner bypass explicitly.
- [x] **Should `kanmer-gate` be required now?** — No. CORE-024 must first add a real job and that job must post at least once; only then is its observed check name added.
- [x] **How are settings preserved as knowledge?** — Add `docs/plans/compiled-workflow/playbook.md` with exact readback, evidence, verification, and emergency-restoration instructions.
- [x] **What happens during a CI/provider outage?** — Only an authorized human may temporarily remove the failing required check/rule, recording reason, timestamp, actor, affected PRs, and a restoration ticket; agents never bypass it.

## Values to record during execution (not unresolved decisions)

- GitHub repository identifier and rule/branch-protection IDs.
- Successful run 1: PR, head SHA, run ID, observed check name, conclusion, timestamp.
- Successful run 2: PR, head SHA, run ID, observed check name, conclusion, timestamp.
- GUI-085 proof/merge reference.
- Operator and timestamp for initial enablement.
- Behavioural-test evidence for blocked PR, refused direct `main` push, and successful board push.

## Parked (explicitly deferred)

No questions are parked.
