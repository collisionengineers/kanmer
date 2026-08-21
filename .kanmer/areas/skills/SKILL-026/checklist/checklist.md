# Checklist — SKILL-026

- [x] Add a disposable-repository GUI/main integration test using the canonical skeleton, real managed-block CLI writer, core staleness detector, and production GUI removal helper.
- [x] Reword the canonical skeleton's ownership comment so a missing-file setup input contains neither exact managed-marker sentinel; retain the writer's malformed-marker refusal.
- [x] Assert setup output contains the canonical conduct block and all five required user-owned guide headings.
- [x] Assert a repeat writer invocation is byte-identical.
- [x] Tamper only inside the managed block and assert core reports `agents-block: behind` from the shipped setup-skill reference.
- [x] Remove the block through the GUI helper and assert the canonical template survives byte-for-byte while markers are gone.
- [x] Assert post-removal state is `unstamped`, preserving distinct drift semantics.
- [x] Run focused GUI test, targeted core staleness test, `npm run verify:agents-block`, `npm run verify:skills`, GUI typecheck, and `git diff --check`.
- [x] Write the post-implementation report, push/open PR, record traceability, and move to Review.

## Progress notes

- Planning inputs: current setup skill/writer/template, core staleness detector, GUI inverse helper, completed [[SKILL-023]] and [[SKILL-024]], and EPIC-012's disposable-repo approval contract.
- Initial focused integration run exposed the defect: `agents-template.md` contained the literal closing sentinel in a comment, so the writer reported `start at -1, end at 158` and correctly refused the documented no-file path. The repair removes both exact sentinels from template prose; the writer and detector remain unchanged.
- Passed after repair: focused GUI ownership test 2/2; full GUI suite 32 files / 312 tests; core staleness 40 tests; skill-prose Node tests 5/5; `verify:agents-block` 31/31; `verify:skills`; GUI typecheck; and `git diff --check`.
- Commit `f9afee5d60069a21cdd7712f2a64d1b0b1e7ddcd` pushed on `skill-026-agents-ownership-integration`; opened PR #99.
