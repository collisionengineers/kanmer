# Checklist — GUI-096

## Core data

- [x] Add sorted gate-exempt `scratch: string[]` to `TicketDocsInfo`.
- [x] Populate it through existing core `listScratch` in `getTicketDocsInfo`.
- [x] Preserve docs/counts/checklist/references and legacy null behavior.
- [x] Test empty/sorted scratch lists, exclusions, no-write read, and no gate satisfaction.

## Scratch tab

- [x] Add a top-level Scratch tab outside `docTypes`.
- [x] Show note count/existence without gate/readiness styling.
- [x] Prefer selected existing slug, then `review`, then first sorted slug.
- [x] Render existing slugs and an explicit gate-exempt empty state.
- [x] Add new-note slug input/button.
- [x] Reject blank, non-lowercase-kebab, slash/backslash, dot/traversal, and duplicate slugs before calls.
- [x] Select valid `scratch/<slug>` without creating an empty file.
- [x] Reuse `DocEditor` for read/edit/preview/versioned save/conflict behavior.
- [x] Add `onSaved` callback and refresh docs info after successful scratch save.
- [x] Preserve dirty-tab confirmation when switching notes/tabs.
- [x] Do not add scratch delete, rename, ordering, doc type, or gate behavior.

## Group context

- [x] Fetch only `item.groups[0]` through existing `getGroupDoc(id,"context.md")`.
- [x] Reload/cancel stale fetches on item, first-group, or change-signal changes.
- [x] Render read-only Markdown pane immediately above Body.
- [x] Reuse escaped markdown/wiki-link navigation.
- [x] Show explicit loading, missing, and error states without blocking body editing.
- [x] Show no pane for ungrouped tickets and never substitute another group.
- [x] Do not add editing or multi-group aggregation.

## Tests and proof

- [x] Add jsdom Editor tests with complete mock client.
- [x] Prove Scratch is separate from pipeline tabs and ticket-only.
- [x] Prove sorted list/review preference/select/read/save/version/refresh.
- [x] Reconcile valid new-note flow and invalid/duplicate/traversal no-write behavior against merged main: createScratch selects a valid scratch/<slug> without writing; exact-input validation rejects invalid and duplicate names; Editor 10/10 includes traversal and whitespace no-write coverage. No screenshot or unrun test is claimed.
- [x] Reconcile conflict/dirty protection against merged main: versioned DocEditor save uses expectedVersion, conflict UI requires an explicit keep/discard choice, and tryTab preserves dirty text behind the existing confirmation path; no new behavior was introduced in this audit.
- [x] Prove scratch does not alter gates/readiness.
- [x] Reconcile first-group context states against merged main: item.groups[0] is the only fetch key, cancellation handles item/group/change-signal reloads, content uses the existing escaped Markdown/wiki renderer, and loading/missing/error/ungrouped states are explicit; Editor 10/10 covers content/missing and the remaining states are code-path evidence, not screenshots.
- [x] Add minimal responsive/accessible CSS; no unrelated redesign.
- [x] Run merged-main rails: core docs 50/50, GUI 338/338, all-workspace typecheck, GUI build, and diff-check passed. npm run verify was attempted twice; first run failed 60/61 on TUNNEL_READINESS_TIMEOUT, exact rerun failed 59/61 on project resolution ETIMEDOUT plus the same readiness timeout. Both unrelated HTTP failures are retained; no overall verify PASS is claimed.
- [x] Confirm existing Editor is the production caller.
- [x] Confirm no IPC/preload/client method, gate/profile/doc type, fourth view, MCP/plugin/manual/package/lock change.
- [x] Existing implementation PR #91 already carried Kanmer: GUI-096 and merged at 6dec9c5af9731b74849115d77305bcb443b12dd1; this is docs-only reconciliation, so no new PR is opened. Interactive screenshots remain unavailable in this Windows session and no screenshot evidence is claimed.
- [x] Keep `docs_todo` until DOC-011 links FRD deltas.
- [x] Stop at review readiness; do not merge or begin GUI-097.

## Progress notes

- 2026-08-20: Added core `TicketDocsInfo.scratch` via `listScratch`, a non-gated Scratch editor tab, and first-group context pane. Focused core docs tests: 50/50; focused Editor tests: 4/4; full GUI suite: 30 files / 300 tests; core and GUI typechecks plus GUI production build and `git diff --check` passed.
- `npm run verify` was attempted but this repository has no `verify` script (CORE-031 owns the shared rail). Visual screenshots remain review-visible work; Windows interactive capture is unavailable in this session.
- 2026-08-21 merged-main reconciliation: PR #91 is already merged; focused Editor 10/10, core docs 50/50, full GUI suite 37 files / 338 tests; all-workspace typecheck, GUI build, and diff-check passed. Root npm run verify ran twice and retained unrelated HTTP failures (first 60/61 readiness timeout; exact rerun 59/61 with project-resolution ETIMEDOUT plus readiness timeout).
- 2026-08-21 evidence disposition: the five stale boxes are now checked with explicit code-path/test evidence and limitations; screenshots remain unavailable and no overall verify PASS is claimed.

---

## Closeout — GUI-096

- [x] PR merge verified (`gh pr view --json state,mergedAt`): PR #91 is MERGED at 2026-08-20T23:32:44Z.
- [x] proof.md finalised with merged-main evidence and limitations.
- [x] Moved to final stage (Done).
- [x] Outcome recorded in ticket body (PR link, GUI-103 remediation, documented evidence limitations).
- [x] cd out of worktree; `git worktree remove .worktrees/gui-096`
- [x] `git branch -d gui-096-editor-scratch-context` (safe after verified MERGED PR; local branch deleted)
- [x] `git fetch --prune` + `git worktree prune` (remote feature branch also deleted)
- [x] `take_ticket action: "release"`
