# Checklist — CORE-102

## Execution

- [x] Take CORE-102 only after the execution packet is ready, using its dedicated branch and worktree; confirm current main still declares `pr-review` with prefix `PR`.
- [x] Refactor the named area-ID/folder test in `packages/core/src/store.test.ts` to create `PR-001` in `areas/pr-review/PR-001/PR-001.md` and `TICK-001` in `areas/_none/TICK-001/TICK-001.md`, retaining real `fs.access` assertions.
- [x] Keep `addColumn` independently exercised in the existing custom-area/filter test and make successful registration observable without mocking, cache warming, timeout/hook changes, or retries.
- [x] Confirm the diff touches only `packages/core/src/store.test.ts`; confirm no `io.ts`, runtime store/ID code, package script, workflow, release, tag, asset, or documentation change is included.
- [ ] Stop and report rather than expanding scope if an implementation requires a production lock-identity/recovery change.

## Verification

- [x] Run the focused area-ID/folder test through `npm run test -w @kanmer/core -- --reporter=verbose -t "gives tickets area-based ids and places them in the area's folder"`; record exit code and named assertion result.
- [x] Run the focused independent custom-area/`addColumn` test through `npm run test -w @kanmer/core -- --reporter=verbose -t "creates with an area and filters by it"`; record exit code and named assertion result.
- [x] Run `npm run test -w @kanmer/core`; record the full core file/test counts and exit code with the unchanged finite test bound.
- [x] Run `npm run typecheck -w @kanmer/core`, `npm run build -w @kanmer/core`, and `git diff --check`; record each exit code.
- [ ] From a fresh normal GitHub-origin clone at the exact implementation head, run `npm ci --ignore-scripts` then `npm run verify`; preserve all output and exit codes.
- [ ] Open a PR with the `Kanmer: CORE-102` footer, record the post-implementation report, and move only to Review for independent review; do not merge, publish, tag, write proof, or change CORE-101.

## Stop conditions

- [ ] Stop if the separate `addColumn` case still times out or fails: it is a distinct lock-path result, not a reason to weaken the ticket-creation test.
- [ ] Stop if any test needs a longer timeout, retry, skipped assertion, mock, cache pre-warm, workflow/release mutation, or a production lock-identity change.

## Progress notes

- 2026-08-25: Dedicated worktree `.worktrees/core-102` created from `origin/main` at `e1f8f148c59093ba6fe259777067d4723ebecb5e`; ticket taken on `core-102-stabilize-area-id-test`.
- 2026-08-25: Focused area-ID/folder test passed (exit 0; named test passed in 70 ms). Focused independent custom-area/`addColumn` test passed (exit 0; named test passed in 567 ms).
- 2026-08-25: Ten bounded fresh focused invocations of the area-ID/folder test all passed (exit 0; test durations 61, 64, 66, 67, 69, 69, 72, 75, 88, and 155 ms). No timeout, retry, cache warm, or assertion change was used.
- 2026-08-25: Full core suite passed (exit 0; 15 files, 310 tests). Core typecheck, core build, and `git diff --check` each passed (exit 0).
