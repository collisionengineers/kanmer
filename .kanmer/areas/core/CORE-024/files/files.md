# Files — CORE-024

## Add

| Path | Exact responsibility |
|---|---|
| `packages/core/src/merge-gate.ts` | Pure/read-only phase-1 evaluator, PR input/result/finding types, ticket resolution helpers, and `NO_TICKET`/`OPEN_QUESTIONS` findings. It accepts a `KanmerStore`; it does not print, exit, initialize, or mutate. |
| `packages/core/src/merge-gate.test.ts` | Deterministic tests for footer/branch precedence, alphanumeric prefixes, ambiguity/missing/non-ticket cases, open/checked/parked/multi-file questions, absent questions, result shape, and zero-write board behavior. |
| `packages/mcp-server/src/check-pr.mjs` | Dependency-free CLI wrapper around built core: parse args/event, construct read-only store, evaluate, emit one JSON verdict on stdout, escaped GitHub annotations on stderr, and exact 0/1/2 exit codes. |

## Modify

| Path | Exact responsibility |
|---|---|
| `packages/core/src/store.ts` | Add one public read-only question-count method that locates the ticket and delegates to `countCheckboxes(...,{stopAtParked:true})`; no parser copy and no initialization. Return a documented null/error for missing/legacy/non-ticket layout. |
| `packages/core/src/types.ts` | Add/export open-question count type only if the store method needs a public type; avoid unrelated merge-gate types here if they live in `merge-gate.ts`. |
| `packages/core/src/index.ts` | Export `merge-gate.ts`; existing `docpaths` export already exposes the single checkbox parser. |
| `.github/workflows/pr.yml` | Preserve the existing `verify` job and add one independent Windows job `kanmer-gate` that installs, builds core, fetches `kanmer-board`, creates a separate temp worktree, and runs the CLI with event/board paths. |
| `AGENTS.md` | Update only command/PR-check guidance made inaccurate by the new real gate job: exact local phase-1 check command and warning never to point `--board` at the PR checkout. Do not document phase-2 checks prematurely. |
| `docs/plans/compiled-workflow/playbook.md` | After the job posts on a real PR, record its exact displayed check name and phase-1 troubleshooting/exit meanings. Do not add it to required checks until the playbook/CORE-033 procedure’s observed-once prerequisite is met by an authorized operator. Modify only if CORE-033 has landed and this file exists. |

## Inspect / reuse unchanged

| Path | Why |
|---|---|
| `packages/core/src/docpaths.ts` | Sole `countCheckboxes` and parked-heading parser; never copy its regex. |
| `packages/core/src/store.ts#getItem` / `getDocGates` | Existing read methods and item semantics. Merge gate uses a new narrow question-count read rather than a profile-specific boundary. |
| `packages/core/src/frontmatter.ts` / `types.ts` | Confirm `type`/ID normalization and non-ticket distinction. |
| `.github/workflows/pr.yml` from CORE-032 | Exact event, permissions, Bash, Windows, and stable `verify` job contract. |
| `MASTERPLAN.md` GA-06 / Appendix A | Load-bearing resolution regex, board worktree, event mapping, exit-code contract, and stable job-name rule. |
| `docs/functional/frd/FRD-009-interrogative-workflow.md` | Open-question authority and parked behavior. |
| `docs/architecture/adr/ADR-0011-gates-may-read-open-questions.md` | Authorization for deterministic question reading. |
| ADR-0016 / FRD-022 after DOC-011 | GitHub merge physics/tool-independent CLI contract. Link if implementation order makes them available. |

## Exact workflow paths/commands

```bash
npm ci
npm run build:core
git fetch origin kanmer-board
git worktree add "$RUNNER_TEMP/kanmer-board" origin/kanmer-board
node packages/mcp-server/src/check-pr.mjs \
  --board "$RUNNER_TEMP/kanmer-board" \
  --event "$GITHUB_EVENT_PATH"
```

## Ripple effects

- CORE-025 extends `MergeGateFinding` and evaluator in place; public names/result fields must be stable and not phase-1-specific.
- CORE-033 adds the observed `kanmer-gate` check to protection only after this job posts once.
- CORE-035 relies on exact codes and exit/severity behavior.
- No MCP tool surface changes: do not rebuild plugin bundle or change tool count/reference.

## Do not modify

- Existing `verify` job name/commands, branch protection settings, board sync policy, MCP tool registry, GUI, profiles/gates, plugin bundle/reference, package dependencies, lockfile, or release workflow.
- Add GitHub write permissions, a GitHub App, Checks API calls, auto-merge, phase-2 codes, checklist-tag parsing, or a second checkbox regex.
