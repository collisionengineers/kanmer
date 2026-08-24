---
kind: review-attestation
pr: "247"
head_sha: "74051a072a199ac8d87c8250fa28be20acb52940"
verdict: needs-changes
reviewer: "codex-root-independent-reviewer"
independent: true
plan_hash: "e277c7dfeba846ca"
ticket_updated: "2026-08-24T21:08:03.323Z"
findings:
  - id: "REV-001"
    severity: major
    summary: "The checklist leaves the retained pre-mutation failure as an unticked task, preventing a terminal Done record."
    disposition: open
---

# Independent review — CORE-098

## Decision

NEEDS CHANGES. This review is independent of the CORE-098 author. The generated source diff and release-preparation evidence are otherwise aligned with the plan, but the ticket record must be made terminally auditable before merge.

## Confirmed implementation evidence

The exact PR head changes only the eight release-script-generated version, lockfile, plugin-manifest, and version-stamped MCP bundle artifacts. It contains no workflow, release-script, publisher, permission, tag, release, or asset change. The author’s corrected preparation invocation passed the full local rail: Core 310/310, GUI 468/468, MCP HTTP 102/102, scripts 99/99, type/docs/smoke/MCPB/skills/AGENTS/plugin checks, and a clean generated diff. No v0.3.5 tag, release, asset, publication, or v0.3.4 mutation occurred.

The first preparation attempt is correctly retained as a pre-mutation configuration failure: it omitted process-scoped KANMER_ROOT and failed the MCP HTTP rail before creating any release branch, commit, PR, tag, or package. The amended plan authorizes the single corrected invocation that produced this PR.

## Finding

- **REV-001 — major, open:** The checklist line for the retained failed attempt is intentionally left as `- [ ]`. The horizon and repository completion rules require no unchecked checklist items at Done. Reword and tick it as a completed evidence-preservation/disposition action (without representing the failed run as success), then re-read gates and request a fresh exact-head review. This is a board-document-only fix; do not alter the generated source diff, rerun release preparation, tag, publish, or merge.

## Required check state

The original kanmer-gate failure was a retained pre-Review `WRONG_STAGE` snapshot. Hosted verify passed at this head; the gate rerun is separate evidence and must be green before a PASS decision. No GitHub review threads or comments were found in the preceding live read.

## Residual risk

The corrected preparation depends on the required local publisher phase after protected-main merge; that is intentionally out of scope for this PR and remains governed by CORE-098’s plan.
