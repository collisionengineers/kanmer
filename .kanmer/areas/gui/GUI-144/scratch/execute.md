## Transitions

- 2026-08-28T03:40:00Z stage review → implementing by claude-code (auto-run controller); reason: needs-changes attestation scratch/review.md v63961e7382adc4e0 at PR #294 head a9033ec2 — F-001 major: projectRegistry.test.ts fixture injects a duplicate `lease_id:` block after CORE-115's takeTicket already writes lease fields → YAML duplicate key → ticket dropped → hosted verify red; F-002 major: "Open project" on a non-selected card calls openProject directly and does not select the project; F-003..F-007 minors recommended. review_round 1 of remediation_budget 1. Same branch gui-144-project-registry, worktree .worktrees/gui-144, PR #294.

- 2026-08-28T04:50:00Z stage review → implementing by claude-code (auto-run controller); reason: operator: round 2 authorised by Alex on 2026-08-28 after delta attestation scratch/review.md v7899872c49fddca3 at PR #294 head 50ff61cc found a new major F-013 (Settings draft from project A saved into project B after Open project — regression from the F-002 fix) plus F-014/F-015 minors; remediation_budget raised 1 → 2; review_round 2. Same branch gui-144-project-registry, worktree .worktrees/gui-144, PR #294.

## Remediation round 2 (2026-08-27, auto run 20260827T133106Z-claude-code)

Resumed the recorded location: branch `gui-144-project-registry`, worktree `.worktrees/gui-144` (validated: toplevel matches, same `.git` common dir, branch exact). Rebased onto `origin/main` 9c9a6980 (CORE-124) — clean, no conflicts; earlier heads `a9033ec2`/`50ff61cc` are unreachable.

Fixed the three open findings of `scratch/review.md` v7899872c49fddca3:

- **F-013 (major)** — `App.tsx`: "Open project" from the Projects tab now goes through `requestOpen({ kind: "path", path })` (`openProjectFromSettings`), so the dirty-editor guard applies exactly as for the folder picker and tab strip; `<Settings key={root ?? "none"}>` remounts Settings on every project switch so `draft` (initialised once) can never outlive its project; a ref preserves/resets the open Settings tab across that remount. `Settings.tsx` adds defence in depth: a modified board draft blocks the open behind an explicit "Discard and open" `alertdialog`, and `save` refuses a draft whose originating `projectId` differs from the current one. New `Settings.projects.test.tsx` (3 tests) proves the guard fires, the discard path opens B, the re-keyed Settings drafts B's board and `onSaveBoard` receives B's config with none of A's edit, and that even unkeyed the cross-project save is refused.
- **F-014 (minor)** — `assertSelectedEndpoint` filters all `selected` endpoints and accepts the named one among them (a registry may validly name one logical project twice); refusal lists every bound name. Test: `alpha` + `alpha-mirror` bound to project A both accepted, `beta` refused.
- **F-015 (minor)** — "Open project" is disabled with an explanatory hint unless the endpoint's board was observed (`health` `ok`/`unassigned`), so a stale pointer never reaches `openProjectLocked`'s `store.init()`. Test covers `missing-board`, `invalid`, `error` (disabled, no call) and `unassigned` (still openable). Manual updated.
- F-008..F-012 accepted-risk: unchanged.

Commands (cwd `.worktrees/gui-144`): `git fetch origin && git rebase origin/main` 0 · `npm run typecheck -w @kanmer/gui` 0 · focused vitest (`projectRegistry.test.ts`, `ProjectRegistry.test.tsx`, `Settings.projects.test.tsx`) 27/27 exit 0 (one intermediate failure: my new badge expectation said "No identity", component renders "No identity yet" — expectation corrected) · `npm run build:manual` 0 · `npm run check:manual` 0 · `npm run verify:docs` 0 · `npm test -w @kanmer/gui` 53 files / 520 tests exit 0.

Head `190b022ac9fa6065b9df675fd7cab4f5b5fe3302` force-with-lease pushed to the existing PR #294.

Hosted run **33121178512** at that head: `verify` **success** (job 98688120784, 4m38s); `kanmer-gate` **failure** (job 98688120959) solely on `WRONG_STAGE` — "Kanmer ticket GUI-144 is in stage \"implementing\"; expected review stage \"review\"" (board sha 363b9372 at gate time, before this move); warnings `STALE_REVIEW` (round-1 attestation shape: `threads_snapshot must be an array when present`) and `COMMITS_UNREACHABLE` (2 indeterminate — the pre-rebase SHAs the board still listed then; ticket commits have since been updated to `19fe9fd1`/`3ec2c09b`/`190b022a`). `regate` skipped. The gate needs the controller's re-run now that the board records Review.

Ticket moved implementing → review. PR https://github.com/collisionengineers/kanmer/pull/294 stays open; not merged, no other ticket touched.

## Delta review round 2 — merged (2026-08-27)

Independent delta review by `claude-gui144-delta-reviewer-2` at PR #294 head `190b022ac9fa6065b9df675fd7cab4f5b5fe3302`. Attestation `scratch/review.md` **v bbba51d70ca0f66e**, verdict `pass`, board_sha `5bb62b104b446c318dcf213771bafd57382eeed4`, `threads_snapshot` written as an array (14 threads, 0 unresolved).

F-013 (major), F-014 and F-015 verified fixed at that head; F-001..F-007 confirmed to have survived the rebase onto `origin/main` 9c9a6980; F-008..F-012 unchanged accepted-risk. Three new findings, all non-blocking and dispositioned accepted-risk with the reasoning written onto their Codex threads: **F-016** (minor — the F-015 gate proves the board at `boardRoot` but the card opens `repoRoot ?? boardRoot`, so a stale explicit `repoRoot` can still reach `store.init()`), **F-017** (minor — `includeArchived:false` hides an archived-but-still-leased batch member from controllers/workspaces), **F-018** (note — with a dirty ticket editor the App's open-confirm renders behind the Settings modal at the same `.modal-backdrop` z-index; fails safe). Recorded as follow-ups for a later GUI ticket.

Local verification in `.worktrees/gui-144` at 190b022a: `npm run typecheck -w @kanmer/gui` 0 · focused vitest (`projectRegistry.test.ts` 17, `ProjectRegistry.test.tsx` 7, `Settings.projects.test.tsx` 3) 27/27 0 · `npm test -w @kanmer/gui` 53 files / 520 tests 0 (284.8 s, no host flakiness) · `npm run check:manual` 0 · `npm run verify:docs` 0.

Hosted run 33121178512 at 190b022a: required checks `verify` **success** and `kanmer-gate` **success** (after the controller's re-run with the board in Review); `regate` skipped. `mergeStateStatus` CLEAN.

Merged with `gh pr merge 294 --squash --delete-branch=false` — merge SHA **f3060b063b6f206603ac35c3b595d21752dff3f6**, merged 2026-08-27T22:26:29Z. Branch `gui-144-project-registry` and worktree `.worktrees/gui-144` left in place for `kanmer-verify`. Ticket moved review → verifying (expected_updated 2026-08-27T22:12:50.212Z). No proof written here; no other ticket touched.
