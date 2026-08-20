# Checklist — SKILL-024

- [ ] Add the setup-skill subsection that references the canonical DOC-014 AGENTS skeleton without copying it or the managed block.
- [ ] Specify case-insensitive, any-depth heading detection for Commands, Architecture map, Conventions, Gotchas, and Verification outside the marker span.
- [ ] Document the absent-file flow: template first, then existing managed-block writer and normal CLAUDE.md handling.
- [ ] Document partial and complete existing-file flows that report the exact missing labels or a no-op while preserving human prose.
- [ ] Document the malformed-marker stop condition with no setup workaround.
- [ ] Add the post-board, source-marker-guarded docs-ticket flow and its configured-`docs`-area fallback.
- [ ] Add focused dependency-free setup-skill contract coverage.
- [ ] Exercise no-file, partial-file, and complete-file disposable scenarios and their idempotence.
- [ ] Run `node --test scripts/verify-skill-prose.test.mjs`, `npm run verify:agents-block`, `npm run verify:skills`, and `git diff --check`.

## Progress notes

- Planned from DOC-014’s canonical user-owned skeleton, the existing marker-only writer, and EPIC-012’s approval contract.
