# Plan — SKILL-026: AGENTS.md ownership integration verification

## Approach

Add one focused GUI/main integration test that uses a fresh temporary directory and the real cross-surface implementations. It will materialise the canonical DOC-014 skeleton as the setup skill directs, invoke the actual `scripts/agents-block.mjs` CLI, use core's real `detectStaleness()` with the shipped setup skill bundle, and finish with GUI Connect's real `removeManagedBlock()`. This joins the ownership boundaries without changing them.

A standalone shell-only proof would be non-regressing; copying the body/template or reimplementing removal in a test would create exactly the duplicate ownership this ticket is meant to prevent. A test in `repoStaleness.test.ts` can import the core surface and GUI inverse operation while spawning the script writer, so it is both portable and durable.

## Governing docs

- **FRD-013 — Setup as reconciliation:** prove setup's writer can be repeated and reconciles the managed span without assuming authority over the user-owned guide.
- **FRD-023 — Agent skills system:** protect the shipped agent instruction/skill contract with deterministic, repository-local evidence.
- **ADR-0015 — Staleness by content, not version:** assert the real detector discovers the bundled setup skill body and marks a changed valid span as `agents-block: behind`; no version or second canonical literal is introduced.
- **EPIC-012 context:** prove the agreed final outcome on a disposable repository: managed block, conduct canon, skeleton, visible drift, and safe inverse removal.

## Steps

1. Extend `apps/gui/src/main/repoStaleness.test.ts` with a disposable-repository ownership integration case. Resolve the canonical template, setup skill bundle, and writer script from the repository; create the missing-file setup input by copying the template before executing the writer.
2. Assert the writer-produced file contains the canonical `BLOCK_BODY`, the Agent conduct section, and each required user-owned guide heading; retain the original template bytes for the later ownership assertion.
3. Run the writer a second time and assert the complete AGENTS.md bytes are unchanged, proving real script idempotence.
4. Replace a byte only inside the managed body, invoke `detectStaleness()` against the shipped setup skill directory, and assert its `agents-block` row is `behind`.
5. Call the production GUI `removeManagedBlock()`, write its result, and assert markers are absent while the remaining file equals the original canonical template. Assert the post-removal staleness row is `unstamped`, not a false clean result.
6. Run the focused GUI test, relevant core staleness tests, managed-block lifecycle verifier, skill-prose verifier, GUI typecheck, and whitespace diff check. Record exact output in the report/proof.

## Verification

- Disposable setup creates exactly one canonical managed body plus every canonical user-owned skeleton section.
- A second real writer invocation is byte-identical.
- A valid body tamper is observed through core as `agents-block: behind`.
- Production removal leaves the original template byte-for-byte intact and removes no human-owned prose.
- Focused GUI/core checks and the existing managed-block/skill rails pass.

## Risks and mitigations

- **Test accidentally reimplements production behavior:** invoke the CLI writer, core detector, and GUI removal helper directly; use existing template/body sources instead of literals.
- **Cross-package test becomes path-dependent:** derive repository paths from the test module and use a temporary directory under the OS temp root.
- **Removal expectation overreaches:** assert only ownership boundaries: exact skeleton survives and the marker span is absent. Do not claim provider registration or copied-skill cleanup in this ticket.

## Execution correction

The planned first test exposed a defect in the existing no-file flow: the canonical template contains the exact closing marker sentinel in its explanatory comment, so the real writer correctly refuses it as malformed. Before asserting setup output, reword that comment to refer to the managed marker block without spelling either sentinel. Do **not** weaken malformed-marker detection or change the writer. Then run the same integration test as the proof that the canonical template is safe to materialise before setup.
