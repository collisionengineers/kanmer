---
kind: review-attestation
pr: "315"
head_sha: "acd0ae5200f1f3790b076a35474cf6963f5cdb00"
verdict: pass
reviewer: "mcp056-independent-reviewer"
independent: true
plan_hash: "63dd5df09c13888e"
ticket_updated: "2026-09-03T23:14:38.348Z"
board_sha: "cbade732bb5fdb8a06c24b7c83a2660ff34d7220"
expected_reviewers:
  - "mcp056-independent-reviewer"
threads_snapshot: []
findings:
  - id: F-001
    severity: note
    summary: "smoke-discovery case (e) leaves its kanmer-decoy-* temp tree behind, as every other fixture in that script already does"
    disposition: accepted-risk
    reason: "Pre-existing pattern, not a new class: makeFixture's kanmer-discover-* root and case (c)'s kanmer-noboard-* tree are equally unremoved on main. All live under os.tmpdir(). Cleaning up one case only would be churn; one cleanup pass for the whole script is a separate hygiene ticket."
  - id: F-002
    severity: note
    summary: "http.test.mjs decoy has no .git boundary, so the resolution walk still reaches the filesystem root and the test stays sensitive to a real board above os.tmpdir()"
    disposition: accepted-risk
    reason: "Deliberate and load-bearing. smoke-discovery case (e) bounds its decoy with a .git directory; this one must not, because bounding it would stop the walk before the home-folder .kanmer and remove exactly the acceptance the ticket exists to prove. The residual sensitivity (ticket body point 2) is narrowed, not eliminated, and is the pre-existing condition."
  - id: F-003
    severity: note
    summary: "A half-created .kanmer holding only data/ (init interrupted between ensureDir(data) and writeBoard/writeVersion) is no longer discovered; it now fails loudly instead of self-healing on the next write"
    disposition: accepted-risk
    reason: "Intended direction under ADR-0012 rule 9 (not finding a board is fatal, naming every path tried): the diagnostic now says the path followed by (no board marker), and --root, KANMER_ROOT and --init all recover. The window is an interruption between two adjacent awaits in store.init; every completed init writes data/board.yml and, for format 2+, version.json and areas/. Widening the predicate to accept a bare directory is the defect being fixed."
  - id: F-004
    severity: note
    summary: "Plan step 1 named a bare .kanmer/board.yml as a sixth marker; the implementation omits it"
    disposition: rejected-with-reason
    reason: "The plan entry is imprecise, not the code. resolvePaths has no .kanmer/board.yml in any format (boardFile is always .kanmer/data/board.yml, in formats 1, 2 and 3 alike), and the plan's own constraint says the names come from resolvePaths and never a second list. The author recorded the deviation in the post-implementation report. No code change is warranted."
---

# Review — MCP-056 (PR #315, round 0, consolidated)

Independent reviewer; not the author (the PR was authored through kanmer-execute on the ticket's own worktree, and this review was dispatched separately). Ticket in Review, `review_round` 0 (field absent = 0), `remediation_budget` default 1. No remediation budget consumed.

## What the change does

`discoverBoardRoot` (`packages/core/src/discover.ts`) accepted any `.kanmer` entry via `existsSync`. A pure `isBoardDir(io, root)` now additionally requires `.kanmer` to be a **directory** carrying at least one marker named through `resolvePaths`: `versionFile`, `boardFile` (`data/board.yml`), `projectFile`, `areasRoot`, `tickets`. It is applied at both probe sites (colocated and `.worktrees/*`); a `.kanmer` that exists but fails the predicate is left in `tried` with the suffix ` (no board marker)` and the walk continues to its boundary. ADR-0012 gains rule 1a. Tests: `discover.test.ts` fixtures now carry `version.json` and five cases were added (20 tests); `smoke-discovery.mjs` gains a fixture marker plus case (e) with a `.git`-bounded registry-only decoy; `http.test.mjs` runs its child from a cwd beneath a registry-only decoy. The committed bundle `plugins/kanmer/mcp/kanmer-mcp.cjs` was regenerated (19 insertions, 7 deletions) and contains both `isBoardDir` and the `no board marker` literal.

## Verification performed

| Check | Result |
|---|---|
| Diff read against the plan, `files/files.md` and the post-implementation report (bundle excluded; `plugin:check` proves it) | matches; only the six declared paths changed |
| `npx vitest run src/discover.test.ts` in a detached `origin/MCP-056-discovery-requires-board-markers` checkout with its own `npm ci` | exit 0, 20/20 passed |
| Hosted `verify` on `acd0ae5200f1f3790b076a35474cf6963f5cdb00` (run 33799823464, job 100850634463) | pass, 8m47s |
| GitHub review threads on the head (GraphQL `reviewThreads`) | none |

`npm run verify`, `npm run build`, `smoke:discovery` and `test:http` were deliberately **not** re-run locally: the hosted rail is the authority, and `scripts/verify.mjs` already runs `npm run plugin:check`, which byte-compares the committed bundle against a fresh build and refuses in any checkout that does not own its `@kanmer/core` resolution (`scripts/check-plugin-sync.mjs`; AGENTS.md gotcha 8 / MCP-007). Green `verify` at this exact head is therefore the proof that the committed bundle is not a stale main-core build.

## Scrutiny points

- **Is the marker set exactly the states a real board can be in?** Yes. `store.detectFormat` (`store.ts:691-715`) recognises `version.json` (authoritative), legacy `tickets/` (format 1) and `areas/` without a version file (format 2); `store.init` additionally always writes `data/board.yml`, and `project.json` is the FRD-029 identity file (gotcha 15). Every completed `init()` therefore leaves at least two markers. The live board worktree carries `version.json`, `project.json`, `areas/`, `data/` and `groups/`, and the board branch's `.gitignore` ignores only `data/activity.jsonl`, `data/sources/`, lock and tmp files, so a fresh clone of a board branch always has markers.
- **Is there a legitimate flow needing an *empty* `.kanmer`?** No. Bootstrap is `--init` / `KANMER_INIT=1`, which bypasses discovery entirely (`root.ts:46-49`) and, per `smoke-discovery` case (d), does not create `.kanmer` merely by booting. The GUI never uses discovery: `ensureBoardWorktree` hands MCP the canonical board root explicitly, and when it creates an orphan board worktree with no source `.kanmer` it creates **no** `.kanmer` at all, so nothing changes for it. `scripts/verify.mjs` already writes `.kanmer/version.json` into its test board (and passes it as `KANMER_ROOT`, an unvalidated assertion either way). See F-003 for the one narrow interruption window.
- **Is `resolvePaths` pure and cheap enough per probe?** Yes — pure `path.join`/`path.resolve`, no I/O and no caching needed. It is called only when `.kanmer` already exists at that level, followed by one `isDirectory` and at most five `existsSync` calls, short-circuited by `.some`.
- **Does mutating `tried[tried.length - 1]` keep the diagnostic order stable?** Yes. At both sites the `push` of that exact entry is the immediately preceding statement with no intervening `push`, so the replacement always targets its own entry. Order and byte content of every non-skipped entry are unchanged, which is what the existing `smoke-discovery` case (c) assertions pin.
- **`.worktrees/*` tie-break (ADR rule 4).** Candidate ordering is untouched (`orderCandidates`); rule 1a narrows *acceptance*, so the walk now selects the first candidate that is a board rather than the first that merely has a `.kanmer`. Covered by the new test "skips a registry-only .kanmer inside .worktrees/* in favour of a real board candidate".
- **Is the `http.test.mjs` decoy cleaned up?** Yes — `test.after` calls `removeTreeWithRetry(decoy)` beside the existing `root` teardown, using the Windows-safe helper gotcha 20(a) requires.
- **Does the ADR amendment contradict rule 7?** No. Rule 1a sits inside the discovery-walk section, and `isBoardDir` is called only from inside `discoverBoardRoot`; `root.ts` is untouched, so `--root` / `KANMER_ROOT` remain unvalidated assertions and `npm run inspect` and `smoke.mjs` still point them at directories with no `.kanmer`.
- **Blast radius.** `discoverBoardRoot` has exactly one production caller (`packages/mcp-server/src/root.ts:44`), and `tried` is consumed only as diagnostic text by `noBoardMessage` and `get_status`; nothing parses its entries as paths, so the suffix is safe.

## Acceptance checks

Both plan acceptance checks are met by the author on the machine that exhibits the defect (`npm run verify` exit 0 with default `TMP`/`TEMP` while the home-folder endpoint registry exists; `smoke:discovery` 15/15 printing the decoy with `(no board marker)`), and are independently corroborated by the green hosted `verify` at this head plus the 20/20 focused unit run above.

## Threads

No GitHub review threads exist on `acd0ae5200f1f3790b076a35474cf6963f5cdb00`; `threads_snapshot` is empty and truthful. No `chatgpt-codex-connector` thread was posted on this head, and the bot is never a gate.

## Residual risk

F-001 through F-004 are notes and all carry a terminal disposition. The only behavioural narrowing beyond the defect itself is F-003 — a half-written `.kanmer` now fails loudly rather than self-healing — which is the direction ADR-0012 rule 9 already chose.

## CI

| Check | Run | Conclusion |
|---|---|---|
| `verify` | 33799823464 / job 100850634463 | pass (8m47s) at `acd0ae5200f1f3790b076a35474cf6963f5cdb00` |
| `kanmer-gate` | 33799823464 / job 100850632807 | re-run after this attestation reaches the remote board (red before it existed: no review record) |
| `regate` | 33799823464 / job 100850634382 | skipped (pull_request event) |
