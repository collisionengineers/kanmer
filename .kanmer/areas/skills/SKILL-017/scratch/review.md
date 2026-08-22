# Independent review — SKILL-017

Reviewer: codex-mcp-client; independent of author.

## Changes

PR #143 changes kanmer-auto prose to require gates-first roster routing, durable result reconciliation, explicit stop predicates, bounded serial fallback with lane_limit 1 and parallel-unavailable state, role independence, bounded retry rules, and a non-success classification for partial rosters. It extends verify-skill-prose.mjs with eight positive contract checks and three forbidden-legacy checks, plus two negative fixture tests.

## Checks

PASS: verify:skills 14/14; node --test scripts/verify-skill-prose.test.mjs 7/7; author report records scripts 82/82 after build, typecheck/build/GUI 352/352, and diff checks. Independent rerun of verify:skills, the two new prose tests, and git diff --check passed.

## Finding F-001 — blocking

GitHub required verify check for PR #143 is red on the shared pre-existing Windows path-alias assertion in apps/gui/src/main/kanmerGit.test.ts: RUNNER~1 versus runneradmin. The workflow log shows 351/352 GUI tests passing and no SKILL-017 failure. Disposition: defer to CORE-037, which owns the path-identity remediation and is linked to this packet. Do not merge while the required check is red.

## Finding F-002 — non-blocking accepted risk

Runtime/provider-host scenarios remain INCONCLUSIVE as recorded by the author; this prose/validator change has no provider runtime surface. No live claim is fabricated.

## Verdict

needs-changes — implementation and local rails are sound, but required GitHub verify is red. Re-review after CORE-037 clears the shared CI failure; retain branch/worktree and no merge or verification move now.

## CI update — 2026-08-22
CORE-037 removed the prior Windows path-alias failure from the shared rail, but GitHub verify now fails deterministically in the unrelated MCP tunnel supervisor test (60/61; expected retry starts 2, observed 1) on two attempts. MCP-041 tracks that separate remediation and blocks CORE-037; PR #143 remains held with no merge or scope absorption.
