# Post-delta replan findings — CORE-113

## Scope and evidence

This is the one controlled post-delta replan required after the fresh independent
review of PR #286. It is **not** a new design cycle. It covers only the thirteen
current, unresolved, non-outdated GitHub review threads at exact head
`83279d14638e874bd98ccf764ccd7844897c6993` (base
`ea8a6408ec26d99ae63c9f46e3cd811366881b8c`).

Evidence inspected on 2026-08-26:

- the CORE-113 ticket, prior plan (`5eb0f0c3acd1285f`), files map, post-implementation report, and independent delta attestation;
- [[HZN-008]] context, [FRD-028](docs/functional/frd/FRD-028-rescue-and-reconciliation.md), and [ADR-0021](docs/architecture/adr/ADR-0021-stable-control-plane-for-candidate-work.md);
- live PR #286 head, check rollup, and every live review thread via GitHub GraphQL;
- the current `packages/core/src/reconciliation.ts`, `store.ts`, `types.ts`,
  `packages/mcp-server/src/reconciliation.ts`, registration, tests, test script,
  and existing `git-reachability.mjs` precedent.

The F-001 no-merge-SHA repair at this head is already fixed and is not part of
this replan. The PR remains non-mergeable: its current required `kanmer-gate`
runs failed because the remote board has not yet received this ticket's current
packet/review state, and the live check rollup also contains a failed verify
attempt. Board synchronization and check reruns are operational follow-up, not
a source-code remedy in this batch.

## Root-cause grouping

| Group | Common root cause | Threads |
| --- | --- | --- |
| Evidence authenticity | Collector/parser treats partial, ambiguous, or unverified host data as sufficient evidence for a stage action. | GH-3867199103, GH-3867199107, GH-3867199111, GH-3867199117, GH-3867199132, GH-3867199139, GH-3867199147, GH-3867199191 |
| Policy/apply parity | Classifier ordering and store predicates do not preserve the exact safety meaning of a valid proposal. | GH-3867199126, GH-3867199182 |
| Observable contract and audit | External access and responsibility transfer are not faithfully declared/recorded. | GH-3867199159, GH-3867199170 |
| Regression coverage | The collector tests are absent from the required routine rail. | GH-3867199202 |

## Thread dispositions and bounded remedy

All thirteen are recommended **fix in this single CORE-113 remediation batch**.
None needs a new ticket, a new workflow stage, a dependency, a candidate
control-plane change, or work owned by CORE-114/115/116. The release item below
uses an explicit current-model applicability result; it does not introduce
CORE-116's persisted delivery/release schema.

| GitHub finding | Severity | Current evidence and root cause | Recommended disposition |
| --- | --- | --- | --- |
| GH-3867199103 | major | `proofEvidence` accepts a PASS proof with only `kind`, `result`, and matching `merged_sha`; it ignores required non-empty `environment`/`verified_at` and `attempts` array, so core can propose Done for a partial record. | **Fix.** Validate the complete existing proof-record machine contract before returning `pass`; malformed/incomplete records are `invalid` and cannot propose Done. |
| GH-3867199107 | major | `pullRequestEvidence` infers required status from every `statusCheckRollup` entry. Optional failures, legacy contexts, and zero checks are therefore mistaken for required failure/pending/unavailability. | **Fix.** Gather the fixed `gh pr checks <selector> --required --json state,bucket` surface and derive only its verdict; zero required checks is `not-applicable`. Preserve unavailable collection as inconclusive. |
| GH-3867199111 | major | Recorded `item.commits` are copied into evidence but never tested against the PR merge target before Review can move to Verifying. | **Fix.** Reuse/extend the fixed-argv Git reachability boundary to require every valid recorded commit to be reachable from the exact merge SHA; missing/unreachable/indeterminate evidence refuses the transition. |
| GH-3867199117 | minor | Collector uses `item.prs?.[0]`, so a closed earlier PR can override a later current/merged PR. | **Fix.** Inspect every recorded reference, preserve its selector and apply an explicit unique-current selection rule; ambiguous or unavailable references yield no action rather than position-dependent recovery. |
| GH-3867199126 | minor | Policy regards branch/worktree-only legacy metadata as a claim, but `applyReconciliation` requires `taken_at` to release it. | **Fix.** Use the same non-empty legacy-claim predicate for proposal and apply; retain all clean/identity checks before release. |
| GH-3867199132 | major | URL parsing discards owner/repository and calls `gh pr view <number>` in the local repository, permitting same-number evidence from the wrong repository. | **Fix.** Preserve the complete selector and reject a URL whose repository is not the configured source repository; do not reduce a URL to a number. |
| GH-3867199139 | minor | Any `fs.stat` error becomes `missing`, fabricating absence for access/I/O/resource errors. | **Fix.** Map only not-found errors to `missing`; map every other failure to `unavailable` and no action. |
| GH-3867199147 | major | A clean `git status` alone does not prove a recorded worktree belongs to this source repository or its recorded branch before metadata is cleared. | **Fix.** Before a terminal release proposal, use fixed Git inspection to prove matching common Git directory and checked-out branch; foreign, detached, mismatched, or unavailable identity refuses release. |
| GH-3867199159 | minor | Both reconciliation tools invoke authenticated `gh` but advertise `openWorldHint: false`. | **Fix.** Mark both tool registrations open-world while retaining their read/write annotations and expected-project guard. |
| GH-3867199170 | minor | Successful reconciliation activity stores only action; FRD-028 requires old/new responsible controller and action. | **Fix.** Encode the prior legacy controller/worker identity and current requesting controller with the action in the durable audit activity, without altering future lease schema. |
| GH-3867199182 | major | The classifier returns on dirty workspace before considering a merged Review ticket. A Review→Verifying move does not clean/release that workspace, so valid recovery is unnecessarily blocked. | **Fix.** Preserve dirty evidence as a warning while allowing only the non-destructive merged Review→Verifying path; retain the no-release rule for dirty terminal claims and every destructive-risk path. |
| GH-3867199191 | major | Production collector unconditionally invents `release.state: "none"`; contended/superseded policy branches are only synthetic-test reachable. | **Fix.** Replace invented neutrality with an explicit **not-applicable current-model** state when the current board has no persisted release-state facility, and an **unavailable** state whenever a release source should be read but cannot be. The latter is inconclusive/no-action. This does not add CORE-116 delivery records, leases, or release operations. |
| GH-3867199202 | minor | `reconciliation.test.mjs` is not enumerated by `@kanmer/mcp-server` `test:http`, so `npm test`/`npm run verify` do not run it. | **Fix.** Add the existing test file to the standard enumeration and prove it runs through the full required rail. |

## Revised narrow implementation scope

1. Strengthen the existing evidence model and pure classifier only where it
   needs authenticity/applicability facts: complete proof validity, selected PR
   identity, required-check verdict, recorded-commit reachability, worktree
   identity, and explicit release applicability/unavailability.
2. Strengthen the existing fixed-command MCP collector: no caller-controlled
   executable, command, root, or path; preserve full PR selectors; inspect all
   recorded PRs; collect required checks separately; classify filesystem/Git/GitHub
   errors accurately; and prove worktree repository/branch identity.
3. Keep the existing legal actions. Update policy precedence so a dirty
   workspace is never released/cleaned but does not suppress an otherwise-safe
   merged Review→Verifying move. Require authenticated evidence for all other
   stage moves and terminal release.
4. Make proposal/apply legacy-claim predicates identical and enrich the
   existing reconciliation audit with old/new responsibility plus action.
5. Correct MCP open-world declarations and add focused regressions to the
   normal MCP test command. Regenerate the already-required plugin artifact
   after build.

## Revised acceptance matrix

| Acceptance check | Evidence that must pass |
| --- | --- |
| Proof integrity | Missing/empty `environment` or `verified_at`, missing/non-array `attempts`, invalid result/kind, or nonmatching merge SHA can never move Verifying→Done; a complete matching PASS can. |
| Required-check integrity | Optional failing checks do not block; failing/pending required checks do; zero required checks is not-applicable; failed/unavailable `gh pr checks --required` is inconclusive. |
| PR identity and selection | Cross-repository URL is rejected; all recorded PRs are considered; exactly one safe current selection is used; ambiguity/unavailability does not cause a stage move. |
| Merge provenance | Every recorded commit is reachable from the exact merged target before Review→Verifying; missing, malformed, unreachable, or indeterminate commits refuse it. |
| Workspace preservation | Only ENOENT is missing; all other stat/Git failures are unavailable; clean terminal release requires matching source common-dir and recorded branch; dirty/foreign/mismatched workspaces are preserved. |
| Legal recovery precedence | Merged Review with dirty preserved workspace proposes only Verifying; dirty terminal claim never releases; closed/unmerged and Review-without-PR retain their existing legal/no-action semantics. |
| Release evidence | Current model's absent release facility is explicit not-applicable, not fabricated none; any expected-but-unread release evidence is unavailable and produces no action; no CORE-116 schema or action is added. |
| Audit and protocol | Successful apply records old/new responsible identities and action; both GitHub-backed tools advertise open-world; apply remains expected-project guarded and dry-run remains non-mutating. |
| Regression rail | Core and MCP focused fixtures cover every row above; `npm run verify` exercises `reconciliation.test.mjs`, plugin bundle sync, and all existing rails. |

## Exact file boundary

Modify only the existing CORE-113 implementation/test/registration files plus
`packages/mcp-server/package.json` for standard-test inclusion and the
regenerated `plugins/kanmer/mcp/kanmer-mcp.cjs`. Reuse
`packages/mcp-server/src/git-reachability.mjs` if its fixed-argv helper needs
a small extension. Do not modify board worktree mechanics, package dependencies,
GUI, stage definitions, CORE-114 identity/revision contracts, CORE-115 lease
contracts, or CORE-116 delivery/release persistence.

## Stop condition

One remediation commit addresses the thirteen findings and their matrix, then
the exact new head receives one fresh independent delta review. Do not begin a
second remediation/review loop, merge, move CORE-113, alter PR metadata, create
a ticket, or begin CORE-114 in this research pass.
