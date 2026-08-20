# Proof — SKILL-020

## Merged artifact

- PR: [#89](https://github.com/collisionengineers/kanmer/pull/89)
- State: **MERGED** at 2026-08-20T23:16:28Z
- Merge commit on `main`: `3503c07eedf6a08b7621fcc2ba44f617aa3bba2a`
- Feature commit: `96067ad3636d1f181fa0897a36610e19499f4f86`

Verification ran from a detached checkout of the exact merged commit, not the feature branch.

## Scope evidence

```text
git diff --name-only 3503c07^ 3503c07
plugins/kanmer/skills/kanmer-auto/SKILL.md
plugins/kanmer/skills/kanmer-plan/SKILL.md
scripts/verify-skill-prose.mjs
```

`git diff --check 3503c07^ 3503c07` exited 0.

## Behaviour evidence

| Command | Result |
|---|---|
| `rg -n "never before them|whether or not this ticket.s profile|research everything in parallel" plugins/kanmer/skills/kanmer-plan/SKILL.md plugins/kanmer/skills/kanmer-auto/SKILL.md` | Expected no-match result (exit 1); the three legacy universal claims are absent. |
| `rg -n "get_doc_gates|\\.worktrees/kanmer|~3 lanes|three lanes" …` | Found continuing live-gate routing, board-worktree safety, and ~3-lane cap in the corrected skills. |
| `npm run verify:skills` | Exit 0; all 12 verifier rails passed, including the new gates-first routing rail and the existing FRD-023 R1/profile-map prohibition. |
| `node --test scripts/verify-skill-prose.test.mjs` | Exit 0; 4 passed, 0 failed. |
| `git diff --check 3503c07^ 3503c07` | Exit 0; no whitespace errors. |

## Conclusion

SKILL-020 is verified on merged `main`: planning and auto-routing now derive inputs/actions from each ticket's live `get_doc_gates` report; the bounded material-hole exception remains; the universal research Wave 0 is gone; and the regression rail enforces those constraints without encoding profile requirements.
