# Independent review — CORE-030 / PR #73

## Changes reviewed

- `packages/core/src/staleness.ts` removes `.claude/skills` from `SKILL_DESTINATIONS`, retaining only `.opencode/skills`, `.agents/skills`, and `.grok/skills`. Its ownership comment now correctly limits detection to destinations Kanmer copies into and identifies Claude as marketplace-only.
- `packages/core/src/staleness.test.ts` moves managed-copy positive fixtures from the unowned Claude mirror to `.opencode/skills`, preserving changed-file, nested-file, missing-file, opted-out, foreign-skill, retired-skill, unknown-reference, and stamp coverage.
- The PR adds a targeted regression case with a handmade `.claude/skills` mirror containing a stale-looking `kanmer-plan` folder plus the user-owned `run-kanmer` folder and nested `node_modules`; it asserts neither `skills` nor `skills-stamp` rows are emitted.

## Plan and governing-document check

PASS. The diff matches the plan and implementation report: no GUI/provider code or user directory mutation is included, and [[GUI-090]] remains the designated owner of roster inversion. Independent inspection of `apps/gui/src/main/providers.ts` and `connect.ts` confirms Claude uses the marketplace install path, while OpenCode, Grok, and Antigravity use the three retained copy destinations.

FRD-013 remains satisfied: staleness is detection-only, and this change prevents it from reporting an artefact whose stated reconciliation action cannot affect it. The public `get_status.repo.stale` shape is unchanged; only false Claude rows disappear.

## Checks

- `npm test -w @kanmer/core -- staleness.test.ts` — PASS, 40/40.
- `npm test -w @kanmer/core` — PASS, 250/250.
- `npm run typecheck -w @kanmer/core` — PASS.
- `git diff --check main...HEAD` — PASS.
- `gh pr view 73` / `gh pr diff 73 --patch` — open PR against `main`, exactly the two reviewed core files; no reviews or comments.
- `gh pr checks 73` — no external checks reported. This is absent CI evidence, not a local failure.

## Comments and disposition

- Blocking: none.
- Non-blocking: no external PR checks are configured/reported; independently rerun local core verification passed. No action required for this bounded core change.

## Verdict

**PASS.** The ownership boundary is corrected, existing owned-destination detection is retained, the reported Claude-mirror regression is covered, and the PR remains within plan and FRD-013. Per review assignment, no merge or ticket move was performed.
