## Phase A orientation and preconditions (2026-09-05, operator run)

Orientation read: get_status, get_item CORE-141, get_group_doc HZN-009 context.md, scripts/release.mjs (full), AGENTS.md release/golden/golden:promotion/dist:check rows, CORE-137 scratch/promotion.md + proof/proof.md (precedent transcript for v0.4.1 cut), packages/core/src/migrate.ts (auditProofRecords, migrateProofValidation), scripts/golden-promotion.mjs (--candidate, --dry-run contract).

Note: CORE-141's own implementation PR #331 ("Release notes for 0.4.2 Delivery Recovery (CORE-141)") is already MERGED (2026-09-05T16:21:18Z, head CORE-141-release-0.4.2 -> main). Board still shows CORE-141 in `review` stage with worktree `.worktrees/CORE-141` recorded (leave per instructions; closeout removes it). This is distinct from the release PR that release.mjs will open in step 7.

### Preconditions (all PASS)
| Check | Command | Result |
|---|---|---|
| Clean tree | `git status --short` | only `Kanmer_Upgrade_Pack_2026-09-05/`, `docs/kanmer-error-screen-04-09-26.png`, `info-pack/` (untracked) — PASS |
| HEAD == origin/main | `git rev-parse HEAD`; `git fetch origin main && git rev-parse origin/main` | both `8c515c4afbeba2a3ddf09f40d7d2c6fbe15656f5` — PASS |
| release-notes has 0.4.2 | `grep -m1 "0.4.2" apps/gui/release-notes.md` | `## 0.4.2` present — PASS |
| gui package.json version | `grep '"version"' apps/gui/package.json` | `0.4.1` — PASS |
| gh pr list --state open | `gh pr list --state open` | empty (PR #331 is MERGED, not open) — PASS |
| git worktree list | `git worktree list` | main @8c515c4a, `.worktrees/CORE-141` @415aeb69 [CORE-141-release-0.4.2] (merged branch, left per instructions), `.worktrees/kanmer` @2ab5fc13 [kanmer-board] — PASS, matches expected set exactly |
| tag v0.4.2 | `git tag -l v0.4.2` | empty — PASS |
| node -v | `node -v` | v24.15.0 — PASS |

All preconditions satisfied. Proceeding to sequence step 1 (npm ci).
