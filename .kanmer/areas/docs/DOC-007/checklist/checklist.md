# Checklist — DOC-007 (merged-main reconciliation)

Historical implementation PR #49 is already merged. This checklist records the current-main audit; the two explicit unchecked dispositions are not claimed as newly proven.

## Setup

- [x] Fresh worktree `.worktrees/doc-007` on `doc-007-manual-reconcile` from current `origin/main`.
- [x] Facts gathered against shipped code and current manual artifact, with FRD-024 and live `get_doc_gates` checked.

## Pipeline

- [x] `FROM_FRD`, its loop and `leadProse()` are absent from `scripts/build-manual.mjs`.
- [x] Current generator registers the hand-written chapters in reading order and inserts generated shortcuts.
- [x] Guard rule (a): missing chapter file names the path.
- [x] Guard rule (b): authored top-level `# ` headings are rejected.
- [x] Guard rule (c): authored prose floor is enforced after structural stripping.
- [x] Guard rule (d): `FRD-`/`ADR-`/`PRD-` tokens are rejected in title/body.
- [x] Guard rule (e): `docs/…` paths are rejected while user `.kanmer/` and `.worktrees/` paths remain permitted.
- [x] Duplicate chapter ids are rejected.
- [x] The shortcuts pass and `--check` remain intact; current output has 22 chapters.

## Core chapters

- [x] `stages` — The six stages.
- [x] `profiles` — Profiles: what a ticket owes.
- [x] `gates` — Why can't I move this?.
- [x] `documents` — Ticket documents.
- [x] `references` — Reference files and scratch.
- [x] `proof` — Proof.
- [x] `board-sync` — Sharing a board over Git.

## Remaining chapters

- [x] `install` — Install and open a project.
- [x] `connect` — Connect an agent.
- [x] `first-ticket` — Your first ticket, end to end.
- [ ] `backlog` — The separate Backlog view was withdrawn by GUI-070; Backlog is covered in `stages`, as documented in the plan/report. Parked as an explicit scope disposition.
- [x] `groups` — Areas, epics and horizons.
- [x] `dispatch` — Dispatching agents.
- [x] `sync` — Staying in sync.
- [x] `settings` — Settings, tab by tab.
- [x] `updates` — Keeping Kanmer up to date.
- [x] `glossary` — Glossary.

## Rewrites

- [x] `getting-started` — reduced to orientation and remains chapter 0.
- [x] `troubleshooting` — graduated gate/reference sections and current failure entries retained.

## Tests, wiring, docs

- [x] `manual.test.ts` no longer pins troubleshooting at index 1; getting-started remains pinned at 0.
- [x] `manual.test.ts` raises the authored prose floor above the old 80-character floor.
- [x] `manual.test.ts` asserts no spec token, `docs/…` path, or requirement line.
- [x] `manual.test.ts` asserts the current 22 expected chapter ids and unique ids.
- [x] `check:manual` is wired into the root `test` script.
- [x] `check:manual` is named in the release verification gate.
- [x] FRD-024 Overview/R2/R3 and the guard acceptance criterion are amended; R4 remains owned by GUI-074/GUI-081.
- [x] `npm run build:manual` regenerates and the committed artifact is current.

## Verification

- [x] Aggregate `npm test` passes after the required fresh-worktree `npm run build:core`; the first bootstrap exit 1 is preserved in the report/scratch.
- [x] `npm run typecheck` passes across all workspaces.
- [x] `npm run build:manual` then generated-artifact `git diff --exit-code` passes.
- [x] `npm run check:manual` passes and is reached first by `npm test`.
- [ ] Negative guard fixture was not rerun in this reconciliation; the historical merged proof records each rule's execution and current guard source is unchanged. Leave for independent verification.
- [x] Current generated chapter body counts are recorded: 22 total, 21 authored, shortest authored 2,462 characters, shortest overall 574 generated shortcuts.
- [x] Worktree starts at current `origin/main`; current manual test was reread and the complete rail was rerun after core build.
- [x] Post-implementation report reconciled; existing PR #49 remains the traceability record, so no duplicate PR was opened.

## Explicit dispositions

- The missing `backlog` chapter is intentionally parked because GUI-070 withdrew the separate Backlog view; no chapter for a deleted view is authored.
- The negative guard fixture and live in-app manual reading are left for independent verification. No visual/manual acceptance is claimed from this author reconciliation.
