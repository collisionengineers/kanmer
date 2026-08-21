# Checklist — SKILL-026

- [ ] Add a disposable-repository GUI/main integration test using the canonical skeleton, real managed-block CLI writer, core staleness detector, and production GUI removal helper.
- [ ] Assert setup output contains the canonical conduct block and all five required user-owned guide headings.
- [ ] Assert a repeat writer invocation is byte-identical.
- [ ] Tamper only inside the managed block and assert core reports `agents-block: behind` from the shipped setup-skill reference.
- [ ] Remove the block through the GUI helper and assert the canonical template survives byte-for-byte while markers are gone.
- [ ] Assert post-removal state is `unstamped`, preserving distinct drift semantics.
- [ ] Run focused GUI test, targeted core staleness test, `npm run verify:agents-block`, `npm run verify:skills`, GUI typecheck, and `git diff --check`.
- [ ] Write the post-implementation report, push/open PR, record traceability, and move to Review.

## Progress notes

- Planning inputs: current setup skill/writer/template, core staleness detector, GUI inverse helper, completed [[SKILL-023]] and [[SKILL-024]], and EPIC-012's disposable-repo approval contract.
