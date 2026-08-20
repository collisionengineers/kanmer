# Proof — SKILL-027: board-vs-reality sweep

Verified on merged `main` at `b5013fbfb7b45f21d0ac865ea7bec7d2bb12d12f` (PR #80, merged 2026-08-20T22:23:57Z).

## Automated evidence

| Command | Result |
|---|---|
| `npm run verify:skills` | PASS. All ten checks passed, including check 10: “kanmer-groom keeps the bounded, evidence-first, proposal-only sweep.” |
| `node --test scripts/verify-skill-prose.test.mjs` | PASS. 4/4 tests passed, including the negative fixture that weakens the groom sweep contract and requires verifier failure. |
| `git diff --check` | PASS. No whitespace errors on the merged main checkout. |
| `git status --short` | PASS. Main checkout was clean after fast-forwarding to the merge commit. |

## Behaviour evidence

- The merged `kanmer-groom/SKILL.md` states the candidate bound (non-archived Backlog/Preparing), separate exact-id and distinctive-title `main` searches, merged-PR lookup, commit/diff/PR inspection, proposal record, and an explicit ban on automatic archive/rescope.
- Read-only board inspection confirms the historical calibration is not faked: CORE-028 is archived and GUI-076 is Done, so neither appears in the open-candidate set.
- `git log main --oneline --all --grep='GUI-076\\|Place logo\\|CORE-028\\|duplicate ADR' -i` finds GUI-076 asset commit `9ec7741` and the duplicate-ADR merge history for PRs #57/#59. Together with their recorded ticket outcomes, this demonstrates the rescope and archive evidence paths without changing either live ticket.
- `gh pr view 80 --json state,mergedAt,mergeCommit,url` returned `MERGED`, merge commit `b5013fbfb7b45f21d0ac865ea7bec7d2bb12d12f`, and https://github.com/collisionengineers/kanmer/pull/80.

## Result

PASS. The merged implementation preserves the human-approval boundary and the history-evidence requirements specified by MASTERPLAN S-33.
