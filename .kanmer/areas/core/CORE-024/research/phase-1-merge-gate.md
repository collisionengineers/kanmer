# Research — CORE-024: phase-1 GitHub merge gate

## Questions

1. How can GitHub resolve a PR to exactly one Kanmer ticket without reading or mutating the PR checkout as a board?
2. How can open questions reuse the one checkbox parser, including the parked boundary?
3. What output/exit contract distinguishes a legitimate red gate from an infrastructure failure?

## Findings

### Read-only board access

- `KanmerStore` construction is read-only. `init()` and MCP `ensureInit()` can create a board skeleton and must never be called by CI.
- The workflow must fetch `origin/kanmer-board` and add it as a separate temporary worktree under `$RUNNER_TEMP`. Passing the PR checkout as `--board` would either read source files as a board or initialize/mutate the wrong tree.
- The evaluator should depend on a constructed `KanmerStore` and public read methods only. It must not call any mutation, activity writer, migration, take, or stage move.
- Add a narrowly scoped public read method such as `getOpenQuestionCount(id)` to `KanmerStore` if exact counts are needed. It locates the format-3 ticket and calls the existing exported `countCheckboxes(ticketDir,"open-questions",{stopAtParked:true})`; it does not duplicate regex/parser logic.

### Ticket resolution

- Explicit PR body footer has priority. Parse CRLF/LF lines from bottom to top and accept only a whole line matching `^\s*Kanmer:\s*([A-Z0-9]{2,6}-\d+)\s*$` case-insensitively.
- Normalize the ID to uppercase. If an explicit footer exists but references a missing/non-ticket item, fail `NO_TICKET`; do not silently fall back to the branch because the author made an explicit but invalid linkage claim.
- When no footer exists, match the branch with exactly `/^([A-Z0-9]{2,6}-\d+)/i`, normalize uppercase, and require the item to exist and be `type: ticket`.
- When neither resolves, return `NO_TICKET`. Multiple footer lines are unsafe: if distinct IDs are present, fail `NO_TICKET` with an ambiguous-link message rather than selecting one silently; repeated identical footers may resolve once.

### Open questions

- `countCheckboxes` already recognizes the repository checkbox syntax and stops within each open-question Markdown file at `## Parked...` through `PARKED_HEADING_RE`.
- An absent open-questions folder or zero checkboxes means zero open questions and passes.
- Every unchecked checkbox above the parked heading across all open-question Markdown files is open. Checked boxes and every checkbox below the parked heading do not block.
- Phase 1 checks open questions regardless of the ticket’s current stage/profile. Do not infer it from a specific boundary or copy a checkbox regex into `merge-gate.ts`.

### Evaluator result

Use one extensible core result shared by phase 2:

```ts
interface MergeGateFinding {
  code: "NO_TICKET" | "OPEN_QUESTIONS"; // phase 1, extended later
  level: "error" | "warning";
  message: string;
  details?: Record<string, unknown>;
}

interface MergeGateResult {
  ok: boolean;
  ticketId: string | null;
  source: "footer" | "branch" | null;
  pr: { number: number; headSha: string; branch: string };
  findings: MergeGateFinding[];
}
```

- Phase-1 findings are errors. `ok` is true only when no error-level finding exists.
- The evaluator does not print or exit; it returns deterministic data.
- CORE-025 extends the code union/result without replacing phase 1.

### CLI/event contract

- CLI path is fixed: `packages/mcp-server/src/check-pr.mjs`. It imports the built `@kanmer/core`, so the Actions job runs `npm ci` and `npm run build:core` first.
- Required args: `--board <absolute-or-resolved-board-worktree>` and `--event <GITHUB_EVENT_PATH>`. An optional direct-input mode is unnecessary for phase 1; unit tests call the core evaluator.
- Parse the GitHub event file and require `pull_request.number`, `.head.sha`, `.head.ref`, and `.body` (body may be null → empty string). Missing/invalid event or board/read failure is infrastructure failure.
- Stdout always contains one JSON result on an evaluated PR, including red results. Human annotations go to stderr as escaped GitHub workflow commands:
  - each error finding: `::error title=kanmer/gate [CODE]::<escaped message>`
  - optional success summary: ordinary stderr text, not an error annotation.
- Exit codes:
  - `0`: evaluated and `ok:true`
  - `1`: evaluated and gate failed (`NO_TICKET`/`OPEN_QUESTIONS`)
  - `2`: check could not run (bad args/event, board fetch/path unreadable, parse/unexpected exception).
- Exit 2 emits a JSON infrastructure-error envelope or deterministic stderr message, but must not mislabel it as a normal gate verdict.
- Escape `%`, CR, LF, `:`, and `,` as required by GitHub workflow-command data so ticket/body text cannot inject an annotation command.

### Workflow job

- Extend the existing `.github/workflows/pr.yml` after CORE-032. Keep existing `verify` job unchanged and add exactly one sibling job named/id `kanmer-gate`.
- Job runs on `windows-latest` and inherits workflow-level Bash.
- Permissions remain `contents: read`; checkout/fetch require no write token.
- Steps:
  1. checkout PR source;
  2. setup Node 20;
  3. `npm ci`;
  4. `npm run build:core`;
  5. fetch board branch and add separate worktree:
     `git fetch origin kanmer-board`
     `git worktree add "$RUNNER_TEMP/kanmer-board" origin/kanmer-board`;
  6. run `node packages/mcp-server/src/check-pr.mjs --board "$RUNNER_TEMP/kanmer-board" --event "$GITHUB_EVENT_PATH"`.
- Do not make `kanmer-gate` depend on `verify`; both should report independently. Do not skip drafts. No push trigger is added.
- The job must first post on a real PR before CORE-033 adds its exact displayed check name to branch protection.

## Decisions

- Add core evaluator/types plus a public read-only question-count method and focused core tests.
- Add source `.mjs` CLI and the real workflow job; no MCP tool or plugin bundle change.
- Preserve exact phase-1 codes and exit contract for CORE-025/integration.

## Remaining unknowns

None. The exact displayed GitHub check string is operational evidence captured after the first run; it is not guessed in code or branch protection.
