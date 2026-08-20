# Files — CORE-025

## Modify

| Path | Exact responsibility |
|---|---|
| `packages/core/src/merge-gate.ts` | Extend the existing phase-1 evaluator/result types with the five phase-2 checks, explicit severity/status, stable ordering, dependency filtering, review-record interpretation, and commit-reachability input. Keep it pure and return every applicable finding. |
| `packages/core/src/merge-gate.test.ts` | Add table-driven fixtures for stages, blocker direction/filtering, attestation states, commit reachability, combined findings, and warning/failure aggregation. If phase-1 tests use another colocated name, extend that canonical test file rather than creating a parallel suite. |
| `packages/core/src/index.ts` | Export only the new/expanded public merge-gate types/helpers required by the CLI. Do not expose CLI/Git concerns. |
| `packages/mcp-server/src/check-pr.mjs` | Load `scratch/review.md` read-only, parse frontmatter through `gray-matter`, obtain the PR head SHA, run bounded Git ancestor checks for ticket commits, pass typed evidence to core, emit warning/error workflow commands on stderr, JSON on stdout, and preserve exits 0/1/2. |
| `packages/mcp-server/package.json` | Add a runtime dependency only if the CLI package cannot already resolve `gray-matter`; keep dependency ownership with the shipped CLI. Do not rely accidentally on a root dev dependency. |
| `package-lock.json` | Update only if package dependency ownership changes. |
| `.github/workflows/pr.yml` | Supply/fetch the PR head and sufficient history to `kanmer check-pr`; retain the existing `kanmer-gate` job name and read-only permissions. Do not add a second phase-2 job. |
| `package.json` | Adjust the existing `check-pr`/test script only if needed to invoke the expanded CLI; do not create a second verification pyramid. |
| `docs/functional/frd/FRD-009-interrogative-workflow.md` | Document the phase-2 checks and severity compatibility period if DOC-011 has not already supplied the definitive delta. |
| `docs/architecture/adr/ADR-0011-gates-may-read-open-questions.md` | Inspect for consistency; modify only where the merge-gate read model must be clarified. |
| `docs/architecture/adr/ADR-0016-compiled-workflow.md` | Link/align the phase-2 gate policy after DOC-011 creates it; this ticket must not invent a competing contract. |

## Add only when absent

| Path | Purpose |
|---|---|
| `packages/core/src/merge-gate.test.ts` | Canonical core evaluator test file, only if phase 1 did not create one. |
| `packages/mcp-server/src/check-pr.test.mjs` | CLI boundary tests for Git evidence, JSON/stdout, annotations/stderr, and exits, only if phase 1 has no canonical CLI test location. Prefer extending the existing phase-1 test. |
| `packages/mcp-server/src/git-reachability.mjs` | Small injectable Git helper only if keeping subprocess code in `check-pr.mjs` would prevent deterministic tests. It must not migrate into core. |

## Inspect / reuse

| Path | Reason |
|---|---|
| `packages/core/src/store.ts` | Read-only item/document/link access and final-stage semantics. Never call initialization or mutation paths from the gate. |
| `packages/core/src/links.ts` | Confirm derived `blockedBy` behavior and avoid `computeBlockedIds`, which answers the opposite question. |
| `packages/core/src/types.ts` | Existing item/status/link types and archived representation. |
| `packages/core/src/checklist.ts` or the existing checkbox helper module | Phase-1 open-question behavior remains unchanged. Do not add a second parser. |
| `packages/core/src/frontmatter.ts` | Existing Markdown/frontmatter conventions; review records are parsed, never regexed. |
| `packages/mcp-server/src/root.ts` | Board-root resolution and read-only worktree expectations. |
| `packages/mcp-server/src/smoke*.mjs` | Existing CLI/build smoke style; add a smoke only where unit/CLI tests cannot prove packaged invocation. |
| `scripts/verify.mjs` | CORE-031's shared rail; ensure new tests are reached through existing commands rather than adding an uncalled suite. |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | No MCP tool changes are expected; inspect only to confirm no update is required. |
| `docs/functional/frd/FRD-006-proof-and-verification.md` | Review/proof record semantics from MCP-024/DOC-011. Use the canonical actual filename present in the repo. |
| `.kanmer/groups/EPIC-009/context.md` | Approval boundary and non-goals. |

## Fixture data required

Create disposable fixture content through test helpers, not committed production-board copies:

- ticket in `preparing`, `implementing`, `review`, `verifying`, and `done`;
- source ticket with `blockedBy` resolving to done, archived, live, multiple, and dangling blockers;
- `scratch/review.md` absent, invalid YAML, wrong `kind`, missing SHA, matching SHA, stale SHA, and `needs-changes`;
- `commits[]` empty, duplicate, reachable, unreachable, and unknown-object cases;
- combined ticket containing open questions, wrong stage, blocker, stale review, and unreachable commit.

## Do not modify

- Stage count/order or profile gate definitions.
- `blocks[]` semantics.
- Review/proof record schemas established by MCP-024.
- Branch-protection settings in code.
- The `kanmer-gate` check/job name.
- Warning severities for the three compatibility checks.
- Core code to spawn Git or call GitHub.
- Board files in the real Kanmer worktree while testing.
