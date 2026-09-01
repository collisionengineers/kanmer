---
kind: review-attestation
pr: "308"
head_sha: "61d4962cb65905e65e7ee90eda2317bc93868de6"
verdict: pass
reviewer: "claude-opus-review-gui146-61d4962c"
independent: true
plan_hash: "9e4efc143a5c4d22"
ticket_updated: "2026-09-01T21:01:54.536Z"
board_sha: "d7587fea3d689ebfaed70a5cd518860f6aae90cb"
expected_reviewers:
  - "claude-opus-review-gui146-61d4962c"
threads_snapshot: []
findings:
  - id: F-001
    severity: note
    summary: >-
      The guard regex only matches `import ... from "@kanmer/core"`. A bare
      side-effect `import "@kanmer/core";`, a re-export `export * from
      "@kanmer/core";` and a dynamic `await import("@kanmer/core")` are all
      undetected, yet each would still pull the Node entry into the renderer
      bundle. Confirmed by running the exported checker against each form.
    disposition: accepted-risk
    reason: >-
      Zero instances of any of those forms exist in the renderer today, the
      plan scoped the guard to `from "@kanmer/core"` occurrences, and the new
      `npm run build -w @kanmer/gui` step in VERIFY_STEPS is the authoritative
      catch for every import form. The guard is a fast-fail convenience on top
      of the real gate, not the gate itself.
  - id: F-002
    severity: note
    summary: >-
      `import { type A } from "@kanmer/core";` (inline type modifier, erased at
      build time) is falsely reported as a runtime offender. Confirmed by
      running the exported checker.
    disposition: accepted-risk
    reason: >-
      The checker fails closed rather than open, so it can never let a real
      break through. No renderer file uses the inline-type form, and the
      remedy it would push an author toward (`import type`) is the documented
      house style in AGENTS.md section 7 anyway.
  - id: F-003
    severity: note
    summary: >-
      `walk()` skips only `*.test.ts` / `*.test.tsx`; `*.spec.*` files and
      `__tests__/` directories are not skipped.
    disposition: accepted-risk
    reason: >-
      The repository uses `.test.ts(x)` exclusively under the renderer; the
      skip rule matches the plan's wording exactly. If a `.spec.` convention
      is ever introduced the guard fails closed (over-reports), not open.
  - id: F-004
    severity: note
    summary: >-
      In `scripts/verify.mjs`, the pre-existing comment "The GUI imports
      @kanmer/core from its package export. A clean checkout has no generated
      dist yet, so build the workspace artifacts before tests." now sits
      between the new GUI-build step and `npm test`, slightly detached from
      the `npm run build` entry it originally justified.
    disposition: accepted-risk
    reason: >-
      Purely cosmetic. The sentence still reads correctly as the rationale for
      `npm test` following the build steps, and the step ORDER the plan
      required (GUI build immediately after `npm run build`) is exactly what
      shipped.
  - id: F-005
    severity: note
    summary: >-
      `scripts/release.mjs` now builds the GUI twice per prepare run: once
      inside the `VERIFY_STEPS` gate it imports (line 308, before the version
      bump) and again at its own step 6 (line 414, after the bump).
      `.github/workflows/release.yml`'s `release-verify` job gains the GUI
      build at the tag as well.
    disposition: accepted-risk
    reason: >-
      Reviewed against `release.mjs` directly and judged correct as-is, not a
      defect. The gate build now fails early on a broken renderer graph before
      any tree mutation, version bump, tag or push; step 6 must still rebuild
      after the bump so the packaged artifact carries the new version. The
      only cost is roughly four seconds of CI time. The plan's non-goal ("no
      change to what the release script does after the verify gate") is
      honoured — `release.mjs` is unmodified.
---

# Review attestation — GUI-146 (PR #308, head 61d4962c)

Round 0, one consolidated review of the whole PR, per the HZN-008 "Review
budget and root-cause rule". Reviewer is independent: the ticket's execution
and post-implementation report were written by another agent, and this
reviewer did not implement, edit or push any part of the change.

## Binding values

| Field | Value |
| --- | --- |
| PR | 308, `gui-146-renderer-browser-import` → `main` |
| head_sha | `61d4962cb65905e65e7ee90eda2317bc93868de6` (confirmed via `gh pr view --json headRefOid` and the GraphQL `headRefOid`) |
| base | `a744fd7694b2de6c134e54a236aeede9fbb4e8f3` |
| plan_hash | `9e4efc143a5c4d22` (`get_ticket_doc(doc: "plan").version`) |
| ticket_updated | `2026-09-01T21:01:54.536Z` (`get_item("GUI-146").updated`) |
| board_sha | `d7587fea3d689ebfaed70a5cd518860f6aae90cb` |

This server build (0.3.12) does not report `get_status.boardSync`, so the
board tip was settled the way the skill prescribes for that case: the board
worktree's `git rev-parse HEAD` and `git ls-remote origin kanmer-board` both
return `d7587fea3d689ebfaed70a5cd518860f6aae90cb`. The `kanmer-gate` run also
independently reports `boardSha: d7587fea…`. The board is pushed and the
attestation names a tip the remote has seen.

## Scope — the diff is exactly the plan's files table

`gh pr diff 308` touches four paths and no others:

| Path | Change | Matches files table |
| --- | --- | --- |
| `apps/gui/src/renderer/src/lib/standup.ts` | line 2 only: `@kanmer/core` → `@kanmer/core/browser`; the `import type { … }` on line 3 is untouched | yes |
| `scripts/verify.mjs` | one step plus a two-line comment inserted into `VERIFY_STEPS` | yes |
| `scripts/renderer-core-imports.test.mjs` | new, 100 lines, dependency-free `node:test` | yes |
| `AGENTS.md` | one word into the section 6 `npm run verify` row; one sentence onto the section 7 renderer-import bullet | yes |

Nothing beyond the table. No change to `packages/core/**`, `apps/gui/src/main/**`,
`apps/gui/src/preload/**`, any other renderer file, `plugins/**`, release
manifests, `electron.vite.config.ts` or `scripts/release.mjs` — matching the
ticket's "Not in scope" and the plan's non-goals.

**Managed block untouched.** The `kanmer:instructions` markers in AGENTS.md are
at lines 1 and 81. Both diff hunks land at lines 491 (section 6) and 609
(section 7), far below the block. Hosted `verify` runs `npm run verify:agents-block`
as part of the rail and passed.

## The fix is correct

- `packages/core/src/browser.ts` is `export * from "./stages.js"; export * from "./profiles.js"; …`, and `isCaptureItem` is declared at `packages/core/src/profiles.ts:216`, so the browser entry genuinely re-exports it.
- `packages/core/package.json` `exports` carries `"./browser": { "types": "./dist/browser.d.ts", "import": "./dist/browser.js" }`, so `@kanmer/core/browser` resolves for both the bundler and the type-checker. Neither file was modified by this PR — the entry already existed, exactly as the ticket's cause analysis claimed.
- Every remaining `@kanmer/core` reference under `apps/gui/src/renderer` was read by hand and is `import type` (multi-line in `App.tsx`, `Editor.tsx`, `Settings.tsx`, `client.ts`; single-line in `client.ts:2`). `profileDraft.ts:31` is a prose comment, not an import. The one runtime import in `Settings.projects.test.tsx` is in a test file, which vitest runs in Node and Vite never bundles — correctly excluded by the guard.
- The ticket's root-cause claim is accurate: AGENTS.md section 10 item 4 does require `npm run build -w @kanmer/gui`, while `VERIFY_STEPS` did not run it. This PR closes exactly that gap between the human checklist and the automated rail.

## The verify-rail change

`VERIFY_STEPS` now reads `"npm run build"` → `"npm run build -w @kanmer/gui"` →
`"npm test"` → … — the GUI build is immediately after the core/server build and
before the tests, exactly as the plan's Step 3 specified, with every other step
and its order preserved and the `npm test` board-env override untouched.

`grep -rn VERIFY_STEPS scripts/*.test.mjs .github/workflows/*.yml` finds no
test or workflow pinning the literal array, so no expectation needed updating —
matching the author's recorded finding.

Downstream consumers were checked rather than assumed. `scripts/release.mjs:45`
imports `VERIFY_STEPS` and runs it at line 308; `.github/workflows/pr.yml`'s
required `verify` job runs `npm ci && npm run verify` on `windows-latest`; and
`.github/workflows/release.yml`'s `release-verify` runs `npm run verify` at the
tag. All three therefore gain the GUI build. The `release.mjs` double-build that
results is F-005 and is correct as-is.

## The guard test

`scripts/test-scripts.mjs` `testFilesIn()` enumerates every `*.test.mjs`
directly under `scripts/` — the new file needs no registration, confirmed by
reading the enumerator and by the run below picking it up.

Behaviour verified directly rather than taken from the report. The four forms
the plan named all behave correctly:

| Form | Result |
| --- | --- |
| single-line runtime import | flagged |
| multi-line runtime import | flagged |
| single-line `import type` | accepted |
| multi-line `import type` | accepted |
| `@kanmer/core/browser` | accepted |

The repo-scan test asserts the renderer directory exists, asserts it found
files, walks recursively, and skips `*.test.ts(x)`.

**Red-then-green, reproduced independently and without mutating the tree.**
Rather than re-run the author's revert-and-restore, the exported pure function
was fed the pre-fix source text straight from `main@a744fd76`:

- pre-fix `standup.ts` → `["import { isCaptureItem } from \"@kanmer/core\";"]`
- post-fix `standup.ts` (this head) → `[]`

That is a genuine independent red proof of the exact regression, with no code
change of any kind.

## Commands run for this review, with exit codes

All in the ticket's own worktree `C:\Users\Alex\Documents\GitHub\kanmer\.worktrees\gui-146`,
confirmed clean at `61d4962cb65905e65e7ee90eda2317bc93868de6`:

| Command | Exit |
| --- | --- |
| `node --test scripts/renderer-core-imports.test.mjs` | 0 — 6/6 pass |
| `npm run build -w @kanmer/gui` | 0 — renderer, main and preload emitted; no `createHash` / `__vite-browser-external` error |
| `npm run test:scripts` | 0 — 167/167 pass across 11 suites |
| checker run against pre-fix and post-fix `standup.ts` (read-only) | red then green, as above |

## Required checks

Branch protection on `main` requires exactly `verify` and `kanmer-gate`, and
sets `required_conversation_resolution`.

- **`verify` — success** at this exact head (run 33558733650, job 100025833262). Its log shows the rail order `$ npm run build` (21:02:24) → `$ npm run build -w @kanmer/gui` (21:02:34) → `$ npm test` (21:02:40) → `$ npm run typecheck` → … → `$ npm run plugin:check`, so the new step is genuinely exercised in hosted CI on `windows-latest`, not only locally. This is the acceptance proof for "verify rail shows the GUI build".
- **`kanmer-gate` — failure**, on a single check: `{"code":"NO_REVIEW_RECORD","outcome":"fail","message":"no scratch/review.md review attestation was recorded"}`. Every other gate check passes (`NO_TICKET`, `OPEN_QUESTIONS`, `WRONG_STAGE`, `DEPENDENCY_BLOCKED`, `WRONG_TARGET`, `COMMITS_UNREACHABLE`), and `STALE_REVIEW` is skipped for the same reason. That failure is the absence of *this* record and is expected; it is not a defect in the change. It clears once the board carrying this attestation is pushed and `regate` re-runs the gate.

## Threads and expected reviewers

`reviewThreads.totalCount` is **0** on this head — there are zero GitHub review
threads, so `threads_snapshot` is an empty list as a truthful value and there is
nothing to resolve via `resolveReviewThread`.

The one issue comment is from `chatgpt-codex-connector[bot]`: a review-summary
table recording Code Review **Completed** against commit `61d4962` with no
findings comment and no thread. Per HZN-008 and the review skill, Codex is
evidence, never an expected reviewer and never a gate; its clean completion on
this exact head is recorded here as corroboration only.

`expected_reviewers` is the single named independent reviewer,
`claude-opus-review-gui146-61d4962c`, which has settled by posting this
attestation and the consolidated disposition comment
(`#issuecomment-5500505657`) on this exact head. No reviewer is timeout-absent.

## Acceptance mapping

| Plan criterion | Verdict | Proof |
| --- | --- | --- |
| GUI builds; packaged smoke boots | met (build) / correctly deferred (smoke) | `npm run build -w @kanmer/gui` exit 0 locally and in hosted `verify`. The packaged `KANMER_SMOKE` boot is assigned to `kanmer-verify` at the merge SHA by the plan's own acceptance-mapping row; deferring it is faithful to the plan, not a gap. |
| verify rail shows the GUI build | met | hosted `verify` log, step 2 of the rail |
| guard fails on reintroduction, passes on fix | met | independently reproduced against `main@a744fd76` source text |

## Residual risk

Five findings, all `note`, all `accepted-risk` with reasons. Under the HZN-008
root-cause rule, F-001 through F-003 are one class — "the regex guard's
coverage is narrower than the real hazard" — and the class is dispositioned
once, at the class level, rather than patched per example: the authoritative
protection is the `npm run build -w @kanmer/gui` step now in `VERIFY_STEPS`,
which catches every import form the regex misses. The guard's job is to fail in
two seconds instead of ninety, and it does that for the form that actually
regressed. No follow-up ticket is warranted; widening the regex here would be
review silently implementing new scope.

No open blocker or major finding. No unresolved security, data-loss or
destructive risk — the change removes a build-time Node/browser boundary
violation and adds a rail step and a test.

## Verdict

**pass.** Independent reviewer; expected reviewers settled on this exact head;
zero threads, all mapped (vacuously) and none unresolved; the diff matches the
bounded packet and the post-implementation report; governing-doc obligations
and the plan's acceptance checks are met; the required `verify` check is green
at this head and the only `kanmer-gate` failure is this record's own absence.

Merging is not taken here: this reviewer was dispatched to review only. Merge
authorization, the final pre-merge re-gather, and the single Review → Verifying
move remain with the controller.
