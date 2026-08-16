# Checklist — DOC-007

Derived from plan.md. One box per step.

## Setup

- [ ] Worktree `.worktrees/doc-007` on `doc-007-manual-user-guide` off `origin/main`
- [ ] Facts gathered against **shipped code**, not the FRDs (stages/profiles/gates; documents/references/proof; groups/backlog/dispatch; connect/sync/updates)

## Pipeline

- [ ] Delete `FROM_FRD`, its loop and `leadProse()` from `scripts/build-manual.mjs`
- [ ] Extend the hand-written chapter list to all 19 chapters in reading order
- [ ] Guard rule (a): missing chapter file throws, naming the path
- [ ] Guard rule (b): reject a top-level `# ` heading in a hand-written body
- [ ] Guard rule (c): 400-char prose floor after stripping code fences, tables, headings, list/quote markers
- [ ] Guard rule (d): reject `FRD-`/`ADR-`/`PRD-` in any title or body (all chapters)
- [ ] Guard rule (e): reject a `docs/…` path in any title or body — and confirm `.kanmer/` / `.worktrees/` still pass
- [ ] Reject duplicate chapter ids in the generator
- [ ] Shortcuts pass (3) and `--check` left intact

## Core chapters (the seven a user cannot work without)

- [ ] 5 `stages` — The six stages
- [ ] 6 `profiles` — Profiles: what a ticket owes
- [ ] 7 `gates` — Why can't I move this?
- [ ] 8 `documents` — Ticket documents
- [ ] 9 `references` — Reference files and scratch
- [ ] 10 `proof` — Proof
- [ ] 14 `board-sync` — Sharing a board over Git (written from scratch)

## Remaining chapters

- [ ] 2 `install` — Install and open a project
- [ ] 3 `connect` — Connect an agent
- [ ] 4 `first-ticket` — Your first ticket, end to end
- [ ] 11 `groups` — Areas, epics and horizons
- [ ] 12 `backlog` — The backlog
- [ ] 13 `dispatch` — Dispatching agents
- [ ] 15 `sync` — Staying in sync
- [ ] 16 `settings` — Settings, tab by tab
- [ ] 18 `updates` — Keeping Kanmer up to date
- [ ] 20 `glossary` — Glossary

## Rewrites

- [ ] 1 `getting-started` — reduced to orientation; stays chapter index 0
- [ ] 19 `troubleshooting` — two sections graduate out; new entries added

## Tests, wiring, docs

- [ ] `manual.test.ts`: unpin `troubleshooting` from index 1, keep `getting-started` at 0
- [ ] `manual.test.ts`: raise the prose floor above 80
- [ ] `manual.test.ts`: assert no `FRD-`/`ADR-`/`PRD-` token and no `docs/…` path
- [ ] `manual.test.ts`: assert the expected chapter ids
- [ ] Wire `check:manual` into the root `test` script
- [ ] Wire `check:manual` explicitly into the `release.mjs` verification gate
- [ ] Amend FRD-024: Overview premise, R2 chapter list, R3 pipeline, +1 acceptance criterion (R4 untouched)
- [ ] `npm run build:manual` and commit `chapters.generated.ts`

## Verification (produces proof.md)

- [ ] `npm test` passes
- [ ] `npm run typecheck` passes (all workspaces)
- [ ] `npm run build:manual` then `git diff --exit-code` on the generated file
- [ ] `npm run check:manual` passes, and is demonstrably reached by `npm test`
- [ ] Negative test: a stubbed chapter is refused by the guard, with the reason
- [ ] Chapter body character counts recorded
- [ ] Rebase onto `origin/main`, re-read `manual.test.ts`, re-run the rail
- [ ] Post-implementation report written; PR opened

## Progress notes
