# Post-implementation report — CORE-113

## Delivered

CORE-113 adds the bounded, dry-run-first reconciliation surface required by FRD-028:

- pure core evidence classification and deterministic reconciliation proposals;
- `reconcile_ticket` for read-only fact collection and `apply_reconciliation` for a current, expected-project-guarded board mutation;
- only existing stage moves or a terminal legacy-claim release; no deletion, force push, worktree cleanup, or board-worktree mutation.

The original implementation is `61927fffeced9f216d5849667357e63964345f2d`, the first narrow correction is `83279d14638e874bd98ccf764ccd7844897c6993`, and the one authorised post-delta remediation commit is `db63fb4b150e956dafb88c75c99ff3088a0b72cc`.

## Final remediation scope

The controlled replan incorporated every one of the thirteen current review threads without creating a second implementation ticket:

- validate complete proof metadata before treating a PASS as evidence;
- query only GitHub required checks, preserving pass/fail/pending/unavailable/not-applicable;
- prove every recorded ticket commit is reachable from the exact merge target using fixed argv;
- choose an active recorded PR rather than blindly using the first reference, preserve same-repository URL identity, reject cross-repository or ambiguous refs, and deduplicate equivalent numeric/URL refs;
- distinguish ENOENT from other filesystem failures and prove the terminal worktree belongs to the claimed source repository and branch;
- permit the safe board-only merged Review → Verifying repair despite a dirty workspace while never releasing that workspace;
- use a non-fabricated `not-applicable` release state;
- make policy and apply share the legacy-claim predicate, with an explicit controller-release audit;
- accurately declare Git/GitHub external access and include reconciliation coverage in the normal MCP HTTP rail.

The tool roster remains 39. No dependency, GUI feature, worktree lifecycle, identity/lease schema, or persisted release-attempt schema was added. The committed plugin bundle was regenerated through `npm run plugin:build`.

## Exact final-candidate verification

At `db63fb4b150e956dafb88c75c99ff3088a0b72cc` in `.worktrees/core-113`:

- `npm run verify` — PASS (exit 0): build; 350 core tests; 486 GUI tests; MCP HTTP tests including reconciliation; script checks; MCP, headless, protocol, discovery, docs, skills, agents-block, MCPB, and plugin rails.
- `npm test -w @kanmer/core -- reconciliation` — PASS, 27 tests.
- `node --test packages/mcp-server/src/reconciliation.test.mjs` — PASS, 6 tests.
- `npm run plugin:build` — PASS.
- `npm run plugin:check` — PASS: bundle bytes match and isolated MCP handshake reports 39 tools.
- `git diff --check` — PASS before commit.

The prior exact-head CI retry at `83279d14638e874bd98ccf764ccd7844897c6993` is retained as historical evidence: `verify` passed after an earlier unrelated Windows watcher EPERM attempt, while `kanmer-gate` read an unsynchronised remote board state. Those results are not substituted for the final candidate’s required CI run.

## Handoff

Push only the final commit to existing PR #286, obtain the required checks at that exact head, and run one fresh bounded independent delta review against the thirteen recorded threads and direct callers/tests. Do not merge, start CORE-114, or create another remediation loop before that review result.

## Final independent review outcome

The required fresh independent delta review at `db63fb4b150e956dafb88c75c99ff3088a0b72cc` returned `needs-changes`. It confirmed F-001 through F-014 fixed, but recorded F-015 / GH-3867261017 as a major proof-version time-of-check/time-of-use race and F-016 / GH-3867261023 as a minor rollback-order defect. The GitHub review record is `scratch/review` version `095c95605c643bdf`.

The final PR workflow runs were initiated after the review. Their `kanmer-gate` jobs fail against the unsynchronised remote board, and their `verify` jobs were still running at this report update. This does not change the terminal source-level F-015 result.

CORE-113 is stopped under the one-replan stop condition. No further source remediation, merge, CORE-114 start, or release progression is authorised without an operator decision.

## Exact-head hosted gate evidence

PR #286 run `33022278471` at `db63fb4b150e956dafb88c75c99ff3088a0b72cc` fails `kanmer-gate` in 59 seconds. Its authoritative annotations state that the fetched remote board still has CORE-113 in `backlog` rather than `review`, lists `DOC-027` as a live blocker, and has no `scratch/review.md` attestation. This remote-state failure is separate from the local board records written through MCP. Per the board-worktree policy, no agent committed or pushed the protected `kanmer-board` branch. The `verify` jobs in exact-head runs `33022209622` and `33022222769` subsequently passed; their `kanmer-gate` jobs failed on that same remote-board evidence.
