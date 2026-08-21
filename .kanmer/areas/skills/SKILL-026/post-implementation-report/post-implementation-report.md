# Post-implementation report — SKILL-026

## Summary

A durable disposable-repository integration test now proves the complete AGENTS.md ownership contract across the real setup writer, canonical skeleton, core staleness detector, and GUI removal helper. While writing that test it exposed and repaired a narrow real defect: the canonical skeleton's explanatory comment contained the literal closing managed-marker sentinel, so the real writer rejected a fresh setup as malformed. The template now describes the ownership boundary without embedding either sentinel; marker safety stays strict.

## Changes

| File | Change | Why |
|---|---|---|
| `apps/gui/src/main/repoStaleness.test.ts` | Added a disposable integration case that copies the canonical skeleton, invokes `scripts/agents-block.mjs`, checks canonical conduct/skeleton content and byte-identical repetition, tampers the managed body, calls core `detectStaleness()`, and removes the block with production GUI `removeManagedBlock()`. | Provides one regression test over the actual cross-surface ownership path instead of separate assertions or copied behavior. |
| `plugins/kanmer/skills/kanmer-docs/assets/agents-template.md` | Reworded the ownership comment so it names the marker-delimited instruction block without including an exact sentinel. | A newly copied template previously contained the closing sentinel only; the strict writer correctly interpreted that as malformed and could not initialise the documented no-file path. |
| `scripts/verify-skill-prose.test.mjs` | Updated the template wording assertion and added a negative assertion for both exact sentinels. | Keeps the writer-safe template contract durable. |

## Governing docs

- **FRD-013:** the real writer remains repeatable and owns only the marker span; the user-owned template returns byte-for-byte after removal.
- **FRD-023:** the shipped skills/template instruction surface now has deterministic integration coverage.
- **ADR-0015:** the test verifies a changed valid managed body becomes `agents-block: behind` by discovery from the bundled setup skill. No version marker, literal detector reference, state change, or automatic repair was added.
- **EPIC-012:** the disposable scenario proves the approved block + conduct canon + skeleton + drift visibility + safe removal outcome.

## Verification

- Initial focused test failed before the repair: `scripts/agents-block.mjs <temp-repo>` returned `AGENTS.md has a malformed kanmer:instructions block (start at -1, end at 158)`. This accurately identified the template's literal closing sentinel; no failure was suppressed.
- `npm test -w @kanmer/gui -- --run src/main/repoStaleness.test.ts` — 2/2 passed after repair, including the new ownership integration test.
- `npm test -w @kanmer/gui` — 32 test files, 312 tests passed.
- `npm test -w @kanmer/core -- staleness.test.ts` — 40 tests passed.
- `node --test scripts/verify-skill-prose.test.mjs` — 5/5 passed.
- `npm run verify:agents-block` — 31/31 passed.
- `npm run verify:skills` — passed.
- `npm run typecheck -w @kanmer/gui` — passed.
- `git diff --check` — passed.

## Risks / follow-ups

- The test intentionally covers marker ownership, not provider registration or copied-skill cleanup; those remain covered by Connect tests and outside this ticket.
- No plugin MCP bundle update is required: server source and tool surface are unchanged. The changed skill asset is covered by the skills verifier.

## Verification hand-off

On merged `main`, run:

- `npm test -w @kanmer/gui -- --run src/main/repoStaleness.test.ts`
- `node --test scripts/verify-skill-prose.test.mjs`
- `npm run verify:agents-block`
- `npm run verify:skills`
- `npm run typecheck -w @kanmer/gui`

Expected result: the test creates the canonical skeleton plus managed conduct block, detects a managed-body tamper as `behind`, survives a repeat run unchanged, and removes only the managed content.
