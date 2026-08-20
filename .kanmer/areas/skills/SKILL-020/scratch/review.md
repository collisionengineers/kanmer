# Independent review — SKILL-020 / PR #89

## Changes reviewed

- `kanmer-plan/SKILL.md` now acquires inputs from the ticket's live `get_doc_gates` report, permits non-required research/files only for a named material hole, and makes a user-facing approval paragraph guidance rather than a core gate.
- `kanmer-auto/SKILL.md` replaces universal Wave 0 research with per-ticket current-stage/next-boundary routing, re-reading gates after each phase while retaining the existing question, dependency, lane, target-point, rebase, and board-worktree controls.
- `verify-skill-prose.mjs` adds a narrow gates-first regression rail: it rejects the two measured legacy claims and requires both skills to retain `get_doc_gates`, without encoding any profile/document mapping.

## Independent checks

- PASS — PR #89 is open, mergeable, one commit, and changes exactly the three planned files. No plugin bundle, template, profile/gate, MCP, tool-reference, package, or lockfile path changed.
- PASS — plan/report match the diff and the stated governing context (FRD-023 R1 / ADR-0009 / EPIC-009 / MASTERPLAN S-08). The EPIC context's bounded weak-agent workflow is preserved; no workflow engine or stage was added.
- PASS — `npm run verify:skills` passed all 12 rails, including the new gates-first section and the existing no-profile-map check.
- PASS — `node --test scripts/verify-skill-prose.test.mjs` passed 4/4.
- PASS — legacy-phrase search returned the expected no-match condition; positive verifier assertions confirm ongoing `get_doc_gates` routing.
- PASS — `git diff --check origin/main...HEAD` passed.

## Comments and disposition

- No blocking findings.
- GitHub reports no status checks for this skill-only PR; the deterministic local skill rail and focused verifier test are the relevant evidence and passed.
- The material-hole language is bounded to concrete evidence/decision/file-contract uncertainty, so it does not replace one universal prerequisite with unbounded discretionary research.

## Verdict

PASS — merge PR #89 and move SKILL-020 to Verifying.
