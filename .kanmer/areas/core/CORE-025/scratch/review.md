---
kind: review-attestation
pr: "159"
head_sha: "65e364ad927ef151ba0cea59b123d20feaf095b4"
verdict: needs-changes
reviewer: "gui099-independent-reviewer"
independent: true
plan_hash: "f648ef2f72477947"
ticket_updated: "2026-08-22T07:36:10.526Z"
findings:
  - id: F-001
    severity: major
    summary: "CLI dependency evidence drops dangling blocker references"
    disposition: open
  - id: F-002
    severity: major
    summary: "Review attestation parser accepted incomplete machine records"
    disposition: fixed
  - id: F-003
    severity: major
    summary: "Recorded abbreviated commit ids were treated as invalid"
    disposition: fixed
  - id: F-004
    severity: major
    summary: "Malformed board item files could be evaluated as a partial graph"
    disposition: fixed
  - id: F-005
    severity: minor
    summary: "Legacy phase-one findings omitted their promised outcome"
    disposition: fixed
  - id: F-006
    severity: major
    summary: "Commit reachability was not restricted to the PR base..head range"
    disposition: fixed
---

## Independent review — CORE-025 PR #159

Reviewed final head `65e364ad927ef151ba0cea59b123d20feaf095b4` against the complete plan, ADR-0011, ADR-0016, FRD-009, checklist, report, and final hosted result.

### Fixed prior findings

The five prior review findings are fixed in the final diff and covered by the new tests:

- Complete review-attestation fields and finding dispositions are validated.
- Four-to-forty-character hexadecimal commit abbreviations are passed to Git and ambiguous/missing objects remain indeterminate.
- `listItemsWithWarnings` makes malformed board input fail closed.
- Legacy phase-one `NO_TICKET` and `OPEN_QUESTIONS` findings now carry runtime `outcome: "fail"`.
- Recorded commits are constrained to the PR `base..head` range.

### Blocking finding F-001

`phase2Evidence()` uses `buildLinkIndex(all)` and reads `graph.blockedBy`. The core `buildLinkIndex` implementation only adds a `blockedBy` entry when the referenced target exists in the item set. A live ticket containing `blocks: ["MISSING-ID"]` therefore produces no blocker evidence and can pass `DEPENDENCY_BLOCKED`, although the CORE-025 plan explicitly requires dangling blocker references to fail conservatively and retain their ids.

Fix by deriving dangling blockers directly from every listed item's `blocks[]` alongside the link index, or by using a graph API that preserves missing target ids; add a CLI fixture asserting exit 1 and the missing id in JSON/annotation output.

### Evidence

- Hosted `kanmer-gate` and `verify` PASS, run `32560013616`.
- Final report records focused core 14/14, CLI/helper 5/5, typechecks/builds/diff-check PASS, and `test:http` 66/67 with the unrelated Windows readiness timeout preserved.
- Checklist is 101/102; direct board-push non-trigger observation remains explicitly unchecked/INCONCLUSIVE.
- Scope remains limited to phase-two gate core/CLI/GHA/docs.

### Verdict

NEEDS-CHANGES until dangling blocker evidence is fail-closed. No merge performed.

## F-001 remediation implementation — 2026-08-22

F-001 is fixed in the pending follow-up commit: `phase2Evidence` preserves dangling targets recorded on the evaluated ticket as `exists: false` dependency evidence while retaining derived `blockedBy` direction for valid edges. The CLI regression proves Review ticket `blocks: ["MISSING-ID"]` exits 1 and includes `MISSING-ID` in the `DEPENDENCY_BLOCKED` JSON check and stderr annotation.

Rails: check-pr 5/5, core merge-gate 14/14, mcp-server typecheck PASS, core/mcp builds PASS, HTTP rail 68/68 PASS, diff-check PASS. Existing attestation above remains the independent reviewer’s NEEDS-CHANGES record pending fresh re-review; no merge.

Hosted rerun for F-001 remediation: head `42f0ace65f8aaa7d4e4f95f516df823c0f14da7a`, run `32560430127`; `kanmer-gate` PASS job `97001049652` (1m02s), `verify` PASS job `97001049517` (1m56s). The expected stale-review warning names prior attestation head `65e364ad927ef151ba0cea59b123d20feaf095b4`; no merge.
