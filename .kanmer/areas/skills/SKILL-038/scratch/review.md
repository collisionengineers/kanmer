---
kind: review-attestation
pr: "304"
head_sha: "8010881c4e48ffabe97aba674361980f8ab3b279"
verdict: needs-changes
reviewer: "codex:/root/skill038_review"
independent: true
plan_hash: "1bbff1d6ef433ecc"
ticket_updated: "2026-08-28T12:42:07.902Z"
board_sha: "830cd3461959c68445f8deea2a6fbc841970eb36"
expected_reviewers:
  - "codex:/root/skill038_review"
threads_snapshot:
  - source: github
    id: "PRRT_kwDOT2PEds6dGORs"
    author: "chatgpt-codex-connector"
    resolved: false
    finding: F-005
  - source: github
    id: "PRRT_kwDOT2PEds6dGORx"
    author: "chatgpt-codex-connector"
    resolved: false
    finding: F-006
  - source: github
    id: "PRRT_kwDOT2PEds6dGOR3"
    author: "chatgpt-codex-connector"
    resolved: false
    finding: F-007
  - source: github
    id: "PRRT_kwDOT2PEds6dGOR-"
    author: "chatgpt-codex-connector"
    resolved: false
    finding: F-008
  - source: github
    id: "PRRT_kwDOT2PEds6dK8Gb"
    author: "chatgpt-codex-connector"
    resolved: false
    finding: F-004
  - source: github
    id: "PRRT_kwDOT2PEds6dK8Gg"
    author: "chatgpt-codex-connector"
    resolved: false
    finding: F-003
  - source: github
    id: "PRRT_kwDOT2PEds6dK8Gl"
    author: "chatgpt-codex-connector"
    resolved: false
    finding: F-002
  - source: github
    id: "PRRT_kwDOT2PEds6dK8Gn"
    author: "chatgpt-codex-connector"
    resolved: false
    finding: F-001
findings:
  - id: F-001
    severity: blocker
    summary: "Legacy schema-1/2 successor creation can race an active or uncertain worker."
    disposition: open
  - id: F-002
    severity: major
    summary: "Live foreign-claim exclusions occur after dependency-cycle detection."
    disposition: open
  - id: F-003
    severity: major
    summary: "Transitive dependents of a cyclic component can remain queued forever."
    disposition: open
  - id: F-004
    severity: major
    summary: "Setting the whole run blocked during selection prevents safe independent lanes from completing."
    disposition: open
  - id: F-005
    severity: major
    summary: "The original contract did not detect and terminally disposition dependency cycles."
    disposition: fixed
  - id: F-006
    severity: major
    summary: "The original retry-budget change did not version the run-record contract."
    disposition: fixed
  - id: F-007
    severity: major
    summary: "The original PR absorbed CORE-128 teardown remediation."
    disposition: fixed
  - id: F-008
    severity: major
    summary: "The original PR did not update the canonical AGENTS controller contract."
    disposition: fixed
---

# Independent consolidated review — PR #304

Review run: `/root/skill038_review`.

The review is bound to PR head
`8010881c4e48ffabe97aba674361980f8ab3b279`, base
`add0da7fc17968796f43b3035065de400a4db2d4`, plan version
`1bbff1d6ef433ecc`, ticket timestamp
`2026-08-28T12:42:07.902Z`, and pushed board
`830cd3461959c68445f8deea2a6fbc841970eb36`.

## Verdict

NEEDS_CHANGES. One blocker and three major findings remain. There are no minor
or note findings.

## Required bounded remediation

1. Reconcile every schema-1/2 lane and worker before mutating the legacy record.
   If any worker is active or uncertain, preserve the pointer and ledger, create
   no successor, and stop with exact evidence/operator handoff. Only a fully
   quiescent legacy run may close under its own schema and link a distinct
   schema-3 successor.
2. Order roster selection as ordinary exclusions (including claim handling),
   then external-blocker fixed-point closure, then cyclic-component detection,
   then retention of safe acyclic internal chains.
3. Give every cyclic SCC/self-loop and every transitive downstream dependent a
   terminal blocked disposition naming the originating cycle; dispatch none.
4. Keep the run running while unrelated safe work remains. Set the run blocked
   only after every safe lane is terminal.

Required mutation scenarios are: a foreign-claimed member of an apparent cycle;
a cycle with a multi-hop dependent chain and an independent lane; multiple
cycles plus a self-loop; active/uncertain legacy runs with no successor or
pointer mutation; and a quiescent legacy run with preserved terminal history
and a distinct schema-3 successor.

## Previously remediated findings

The exact six-file diff correctly adds basic cycle detection, schema 3, the
canonical AGENTS entry, and removes CORE-128 ownership. Those four original
findings remain mapped above and must be carried through the delta review.

## Evidence

Local focused checks and hosted `verify`/`kanmer-gate` passed at this head,
but they do not exercise F-001 through F-004. All eight GitHub threads are in
the snapshot; seven are current and F-007's thread is outdated but unresolved.
No thread is resolved before remediation, public disposition, and delta review.
