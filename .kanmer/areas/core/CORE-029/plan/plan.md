# Plan — CORE-029

1. Replace the stale format-2 description in AGENTS.md §4 with the fixed six-stage model and profile-resolved gate wording, leaving the managed block unchanged.
2. Refactor the existing skill-prose verifier’s file inventory so its stage-name check examines both skill files and AGENTS.md while the other skill-only checks remain scoped to skills.
3. Add a focused regression test or verifier fixture proving a stale AGENTS stage sequence fails.
4. Run the verifier, managed-block check, relevant tests, and diff checks; then review, merge, prove on main, and close out.

## Governing docs

- ADR-0002 and the fixed stages implementation are met by correcting the contributor guide; no governing-document edit is required.
