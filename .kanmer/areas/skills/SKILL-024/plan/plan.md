# Plan — SKILL-024: kanmer-setup reconciles an AGENTS.md skeleton

## Approach

Extend the shipped `kanmer-setup` skill around the existing DOC-014 asset and `agents-block` writer instead of adding a second writer or template. The new guidance will inspect the user-owned portion of AGENTS.md, then follow three explicit cases: missing file → copy the canonical skeleton before invoking the existing managed-block writer and later file one idempotent docs ticket; present partial file → report only missing required headings; present complete file → report no skeleton action. This is safer than changing `agents-block.mjs`, whose narrow marker-only contract is shared by setup and GUI and must not gain authority over human prose.

## Governing docs

- **Governing-doc debt remains intentional:** this seeded feature currently has `docs_todo: true`; no dedicated PRD/FRD/ADR is linked or modified in this ticket.
- **Alignment with FRD-013:** preserve setup as a repeatable reconciliation loop and retain the existing managed-block verification rail. No automatic completion of human documentation is introduced.
- **Alignment with FRD-023:** make the contract part of the shipped skill and protect it with dependency-free skill-prose coverage.
- **Alignment with ADR-0015:** do not create another managed body, staleness state, or repair mechanism. Existing content-hash drift detection and the setup repair path remain unchanged.
- **EPIC-012 contract:** deliver the required-section skeleton while preserving the managed/user-owned boundary; SKILL-026 owns broad disposable-repo integration proof.

## Steps

1. Read DOC-014’s canonical `agents-template.md`, the current setup skill, and `agents-block.mjs`; add a focused “user-owned guide skeleton” subsection beside setup’s current AGENTS refresh step without modifying the managed-block literal.
2. Define required-section detection as the five template labels found case-insensitively in Markdown headings outside the Kanmer marker span. State that setup reports missing labels only and never changes present human prose, TODOs, or heading style.
3. Define the absent-file path: copy the canonical template into `<repo>/AGENTS.md`, then invoke the existing writer so it prepends/refreshes the managed block and handles CLAUDE.md exactly as today. State that malformed markers stop the run rather than triggering any workaround.
4. Define the existing-file paths: a partial guide gets an explicit list of missing required labels; a complete guide gets an explicit no-op report for the user-owned skeleton. Both paths still use the existing writer only for the managed span.
5. Define the documentation follow-up after the board exists: search for `Source: AGENTS.md skeleton created by kanmer-setup`; if absent, create exactly one backlog ticket titled `Complete the AGENTS.md contributor guide`, preferring the configured `docs` area or no area if unavailable. Its body must retain that source marker and say the template TODOs need repository facts. Report an existing match rather than duplicating it.
6. Add focused dependency-free contract coverage in `verify-skill-prose.test.mjs` (and only widen the verifier script if essential) for canonical asset use, three-case behavior, marker-boundary preservation, source-marker idempotency, and the no-second-writer constraint.
7. Verify in disposable directories: no AGENTS.md produces template + managed block and one discoverable follow-up marker; a partial guide is byte-identical outside the managed block and reports its exact gaps; a complete guide has no skeleton mutation; each case is idempotent. Then run `node --test scripts/verify-skill-prose.test.mjs`, `npm run verify:agents-block`, `npm run verify:skills`, and `git diff --check`.

## Verification

- A missing AGENTS.md produces the canonical user-owned skeleton and existing managed block without duplicating either; rerunning does not create another guide or source-marked docs ticket.
- Partial and complete existing guides keep their human-authored bytes intact outside the managed markers; partial reports only the missing section names and complete reports no skeleton work.
- Malformed marker handling remains a stop condition from `agents-block.mjs`.
- Focused skill-prose tests, `npm run verify:agents-block`, `npm run verify:skills`, and `git diff --check` pass.

## Risks / open questions

- **Ownership drift:** duplicating template/body prose would create divergent sources. Mitigate by referencing the DOC-014 asset and existing writer only, with negative contract assertions.
- **Duplicate follow-up tickets:** setup is re-entrant. Mitigate with the exact source-marker search before creation.
- **False “missing” reports from document style:** constrain detection to case-insensitive headings at any level outside markers, and report rather than rewrite.
- **User-only questions:** none; the title, ticket body, DOC-014, and EPIC-012 approval contract settle the behavior.
