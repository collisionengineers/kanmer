# Post-implementation report — SKILL-020

## Summary

The planner and autonomous orchestrator now route work from each ticket’s live `get_doc_gates` report instead of imposing research/files on every profile. Planning retains a narrow material-hole exception, and automated Wave 0 dispatches only the next applicable phase. A verifier rail prevents both removed universal-pipeline claims from returning.

## Changes

| File | Change | Why |
|---|---|---|
| `plugins/kanmer/skills/kanmer-plan/SKILL.md` | Replaced unconditional research/files input rules with live-gate routing, bounded material holes, and an approval-paragraph hand-off. | Keeps planning profile-aware without allowing speculative plans. |
| `plugins/kanmer/skills/kanmer-auto/SKILL.md` | Replaced universal research Wave 0 with per-ticket gate routing and re-read-after-phase behavior. | Lets heterogeneous rosters advance according to their actual next requirement while retaining lanes, questions, and board-worktree safety. |
| `scripts/verify-skill-prose.mjs` | Added named regression checks for the two removed claims and continued `get_doc_gates` usage. | Makes the gates-first contract mechanically reviewable without restating profile mappings. |

## Governing docs

This conforms to FRD-023 R1 and ADR-0009 by deriving requirements from `get_doc_gates`, and to EPIC-009 / MASTERPLAN S-08 by retaining one-boundary, lane, question, and board-worktree safety. No governing-doc amendment is required.

## Risks / follow-ups

The material-hole exception is intentionally qualitative but constrained to unresolved evidence/decision or exact file/contract uncertainty that would make a plan speculative. It is not a general invitation to create optional research. No plugin bundle was rebuilt; this is explicitly a skill/verifier-only change.

## Verification hand-off

```bash
rg -n "never before them|whether or not this ticket.s profile|research everything in parallel" plugins/kanmer/skills/kanmer-plan/SKILL.md plugins/kanmer/skills/kanmer-auto/SKILL.md
npm run verify:skills
node --test scripts/verify-skill-prose.test.mjs
git diff --check
```

Expected: the first command finds no legacy claim (exit 1/no matches), the skills rail reports all checks passed, focused tests pass 4/4, and the diff is clean.
