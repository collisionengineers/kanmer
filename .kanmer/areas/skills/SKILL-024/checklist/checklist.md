# Checklist — SKILL-024

- [x] Add the setup-skill subsection that references the canonical DOC-014 AGENTS skeleton without copying it or the managed block.
- [x] Specify case-insensitive, any-depth heading detection for Commands, Architecture map, Conventions, Gotchas, and Verification outside the marker span.
- [x] Document the absent-file flow: template first, then existing managed-block writer and normal CLAUDE.md handling.
- [x] Document partial and complete existing-file flows that report the exact missing labels or a no-op while preserving human prose.
- [x] Document the malformed-marker stop condition with no setup workaround.
- [x] Add the post-board, source-marker-guarded docs-ticket flow and its configured-`docs`-area fallback.
- [x] Add focused dependency-free setup-skill contract coverage.
- [x] Exercise no-file, partial-file, and complete-file disposable scenarios and their idempotence.
- [x] Run `node --test scripts/verify-skill-prose.test.mjs`, `npm run verify:agents-block`, `npm run verify:skills`, and `git diff --check`.

## Progress notes

- Planned from DOC-014’s canonical user-owned skeleton, the existing marker-only writer, and EPIC-012’s approval contract.
- Implemented only the setup skill and its focused contract test; the template, marker writer/body, core staleness, GUI, and MCP bundle remain unchanged.
- Verification passed: focused Node tests 3/3; managed-block lifecycle 31/31; skill-prose verifier passed; `git diff --check` clean. The focused test statically protects the documented missing/partial/complete reconciliation contract, while the existing lifecycle suite provides the disposable-directory writer/idempotence evidence.
