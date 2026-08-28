---
id: SKILL-036
type: ticket
title: >-
  Implement durable /goal orchestration with bounded independent review and
  verification
status: done
area: skills
assignee: claude-code
profile: feature
stageEntered:
  preparing: '2026-08-28T05:20:16.077Z'
  review: '2026-08-28T05:39:17.064Z'
  implementing: '2026-08-28T06:00:13.996Z'
  verifying: '2026-08-28T06:43:45.646Z'
  done: '2026-08-28T07:07:14.622Z'
labels:
  - reliable-autonomy
groups:
  - HZN-008
links: []
blocks:
  - CORE-119
refs:
  - docs/functional/frd/FRD-034-durable-goal-control-and-independent-review.md
commits:
  - aa5f73daa03d94c609ce8d45646ab52fd0f54b0b
  - 26306355aaf2fb374dbfb2e63e82dd344724654a
  - 70d23efda85b3d347e36ad7f1e55fa0d4d32c754
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/302'
archived: false
created: '2026-08-26T21:02:42.025Z'
updated: '2026-08-28T07:10:39.463Z'
---

## What

Add a durable controller that freezes a selected roster, reconciles live state, dispatches bounded work, obtains independent exact-head review, routes finite remediation, merges and verifies exact merged SHAs.

## Why

The approved operating model requires autonomous progress without self-review, stale worker prose or infinite review cycles.

## Approach

- Persist run identity, authority, roster, lanes, retry budget and reconciliation decisions.
- Integrate leases, step packets, review attestations and verification routing.
- Enforce the stated review budget and preserve minor-risk dispositions without reopening unchanged findings.

## Verification

- [ ] A prepared fixture board clears through a fresh reviewer and verifier; exceeded budget performs one controlled replan or records a terminal disposition.

## Outcome

**What shipped:** FRD-034's durable `/goal` orchestration, delivered by extending `kanmer-auto` in place rather than adding a 13th skill. The roster stays at 12 and `EXPECTED_SKILLS` is unchanged. Three genuine FRD-034 gaps were closed: scope beyond a single group (ticket, group, area, list and board scopes, each with its own resolution procedure), an explicitly frozen roster, and a preflight. It also amended `kanmer-review` and `kanmer-verify`, and added check block 19 to `scripts/verify-skill-prose.mjs` with fixture tests. 8 files, 863 insertions, zero paths under `packages/`.

**Why extend rather than add:** `kanmer-auto` already owned every durable-state mechanism FRD-034 names — the run record, the status vocabularies, the reconciliation loop, the stop predicates, the serial fallback, role independence, the four-list report — and `verify-skill-prose.mjs` asserts that prose verbatim. A second orchestrator would have duplicated most of it and given two skills authority over one run record. Both the reviewer and the verifier independently confirmed this was the right call.

**The operating lessons this horizon paid for are now enforced, not just recorded:** sync-before-gate and "dispositioning a finding and resolving its thread are one obligation" went into `kanmer-review`; "`transient` is earned" (same-SHA re-run + diff-untouched confirmation + mechanism argument, every attempt retained) and "read a proof in full, never frontmatter-only" went into `kanmer-verify` — the latter being exactly the CORE-042/GUI-141 failure earlier in this run.

**One remediation round was used** (budget 1 of 1). The review returned `needs-changes` on a blocker — four of five declared scopes had no roster-resolution procedure, so check 19 pinned the advertisement rather than the capability — plus two majors (a hardcoded `origin/main` rebase target, and a replan window that at default `remediation_budget: 1` coincided exactly with the exhausted state). All were fixed on the same PR under the sanctioned same-PR return, each pinned by a named check.

**Verification evidence:** the verifier's own 40-mutation battery caught 40/40 by correctly-named check — including 5/5 anti-absorption (deleting one scope's step fails only that scope) and both halves of the negative assertions (reintroducing literal `rebase origin/main` and `rev-parse origin/kanmer-board` each fired the right check). `## 4. Mandatory stop predicates` byte-identical; no renumbering; exactly four `failure_class` values, consistent with CORE-131's router. All five FRD-034 acceptance criteria and both edge cases met.

**Residual risk / follow-ups:** [[SKILL-038]] owns F-023 (`blockedSet()` hands the whole board to `computeBlockedIds`, so a roster containing a blocker and its dependent silently drops the dependent before the freeze — confirmed pre-existing, zero diff hits, so merging did not worsen `main`). Verification added three notes: N-1, a check named "…and board health" pins that half via a regex also satisfied elsewhere, so deleting the whole board-worktree preflight bullet leaves check 19 green; N-2, check 19 reliably pins each assertion's own named clause but that guarantee does not extend to every acceptance sentence; N-3, `schema: 2` is prose-only and no `packages/` code reads it. N-1 and the F-005 verification-budget concern have been folded into SKILL-038 rather than filed separately.

**Deployment:** n/a — skills and docs only; this board declares no deployment tracking.
