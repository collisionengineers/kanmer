# Checklist — CORE-117

- [x] Create worktree `.worktrees/core-117` on branch `core-117-quick-capture` from `origin/main`.
- [x] `profiles.ts`: add `CAPTURE_PROFILE_ID`, `capture: {}` in `DEFAULT_PROFILES`, `isCaptureItem`, and correct the "four shipped profiles" comment. (Also `CAPTURE_DISPOSITIONS` / `isCaptureDisposition`, so the outcome vocabulary has one home.)
- [x] `board.ts`: add `injectCaptureProfile` inside `resolveProfiles`, before the `questions-resolved` pass, no-op when the board already declares `capture`.
- [x] `types.ts`: add `capture_evidence`, `capture_actor`, `capture_disposition`, `capture_result`, `capture_decided_at`, `capture_decided_by` to `ItemFrontmatterSchema` (all optional) and the matching create/update inputs; add `profile?: string` to `ItemFilter`.
- [x] `frontmatter.ts`: add the six `capture_*` keys to `KEY_ORDER` after `deployment`. (Placed after `prs` and before `deployment` — same block, and it keeps `deployment`/`archived`/`created`/`updated` as the trailing run they already were.)
- [x] `store.createItem`: refuse a capture with a blank title or blank body (`CAPTURE_OBSERVATION_REQUIRED`); stamp `capture_actor` from `this.actor`; persist `capture_evidence`.
- [x] `store.updateItem`: refuse blanking a capture's body, and refuse setting `profile: "capture"` on a ticket with a blank body.
- [x] `store.assertDocGate`: refuse `CAPTURE_NOT_PROMOTED` for a capture moving to any stage but `backlog`, before the collapse and missing-document checks.
- [x] `store.takeTicket`: refuse `CAPTURE_NOT_PROMOTED` for a capture, including when the requested stage equals the current one.
- [x] `store.updateItem`: implement the six-disposition promotion inside the existing `withLeaseLock` section, with `CAPTURE_DISPOSITION_INVALID`, `CAPTURE_RESULT_REQUIRED`, `CAPTURE_PROMOTION_NEEDS_PROFILE`, `CAPTURE_ALREADY_DISPOSED`, and the derived link/archive effects.
- [x] `store.matchesFilter`: honour `filter.profile`.
- [x] `group-members.ts`: exclude captures from `total`/`complete` while still listing them as members.
- [x] `execution-packet.ts`: refuse a capture beside the existing `spike` refusal.
- [x] `mcp-server/src/index.ts`: extend `createFields`, `update_item` schema, `list_items` and `search_items` (`profile`), `summarise` (`capture`, `capture_disposition`), and the two profile description strings — **add no new tool**.
- [x] `apps/gui/.../Editor.tsx` and `TicketCreate.tsx`: add `capture` to `PROFILE_IDS`.
- [x] `apps/gui/.../lib/standup.ts`: exclude captures from the Flags loop and from "Up next".
- [x] [pre-review] Write `packages/core/src/capture.test.ts` covering AC1 (create + search + no doc debt + blank title/body refused), AC2 (move/take/packet refusals, group `total`, standup exclusion), AC3 (all six dispositions, their required inputs, refusals and derived effects), AC4 (post-promotion `feature` gates apply, nothing retroactive) and the edge cases (empty evidence valid; a Backlog capture is never an expired claim). 36 tests. The standup half is `apps/gui/src/renderer/src/lib/standup.capture.test.ts` (4 tests) — it belongs to the GUI suite.
- [x] [pre-review] Regenerate `__snapshots__/profile-matrix.test.ts.snap`; confirm the four existing profiles' rows are byte-identical and only `capture` rows are added. **Not needed** — `profile-matrix.test.ts:62` iterates a hardcoded `["feature","fix","chore","spike"]`, not `DEFAULT_PROFILES`, so the snapshot is untouched and unchanged. `capture.test.ts` asserts the stronger property directly: `resolveProfiles` of an injected board deep-equals one that declares `capture: {}` itself.
- [x] [pre-review] Do not edit `io.test.ts`, `docs.test.ts`, `migrate.test.ts`, `store.test.ts` or `scripts/antigravity-plugin-config.test.mjs` — stop and report if a change appears to need one. None were touched. `board.test.ts:64` did need updating (it asserted the exact shipped profile set); it is not one of the five and not owned by CORE-128.
- [x] Update `kanmer-tickets/SKILL.md` (replace the `docs_todo` default with the capture route; document promotion) and `kanmer-tickets/references/tool-reference.md`.
- [x] Update `kanmer-auto/SKILL.md` (roster drops captures), `kanmer-report/SKILL.md` ("Up next"/Flags), `kanmer-groom/SKILL.md` (sweep + doc-gate debt + a new "undecided captures" item).
- [x] Update `docs/manual/profiles.md` (shipped-profile table, promotion, and that an area `defaultProfile: capture` is unsupported); run `npm run build:manual`.
- [x] [pre-review] Name the production wiring in the report: `resolveProfiles` → `store.gateReport`/`get_doc_gates`; the single `assertDocGate` choke point (`updateItem`, `assertMoveAllowed`, `takeTicket`); the MCP explicit key lists; the rebuilt plugin bundle.
- [x] [pre-review] Run `npm run test -w @kanmer/core`, `npm run typecheck`, `npm run verify:docs` in the worktree and record exact commands and exit codes.
- [x] [pre-review] Run `npm run build`, `npm run plugin:build` and `npm run verify`; commit the regenerated `plugins/kanmer/mcp/` bundle and `chapters.generated.ts`. Run in the worktree, not the repo root: the repo root is checked out at `main` and would have verified the wrong code. `npm install` in the worktree gives it real `node_modules`, so §8 gotcha 8's escape condition does not hold — `plugin:check` ran and passed there rather than refusing.
- [x] [pre-review] Record every known host flake with its exact output; weaken no assertion and skip no test. `claims.test.ts` 5 s timeouts and ENOTEMPTY teardown reproduce identically on unmodified `origin/main` — baseline captured in the report.
- [x] [pre-review] Confirm no tool was added: 39 remains asserted in `smoke.mjs`, `smoke-protocol.mjs`, `AGENTS.md` and `docs/manual/connect.md`, all unedited. `plugin:check` independently reports "39 tools match".
- [ ] Write the post-implementation report, open the PR with a standalone `Kanmer: CORE-117` footer, and move the ticket to Review.
- [ ] [pre-review] Stop at Review. Do not review, merge, verify, close out, release, or touch another ticket.

## Progress notes

- `smoke.mjs` needed two edits, both non-negotiable rather than optional: the summary-field assertion enumerates the exact key set, so `capture`/`capture_disposition` had to be added, and the capture round trip is now proven over the real MCP wire (create → search → refuse move/take/packet → promote). 328/328 checks pass and the tool count is still 39.

- [x] Write the post-implementation report, open the PR with a standalone `Kanmer: CORE-117` footer, and move the ticket to Review. — PR #298, head `cbd05ca5`, ticket in Review.
- [x] [pre-review] Stop at the approved boundary. Nothing was reviewed, merged, verified, closed out or released; no other ticket was touched; the worktree and branch stay in place for review.
- Late fix during the rail: `kanmer-groom/SKILL.md` had to keep the literal phrase "non-archived Backlog or Preparing tickets" that `verify-skill-prose.mjs` pins, so the capture exclusion became a following sentence instead of an edit to that phrase. The guard was left as written rather than relaxed.

---

## Closeout — CORE-117

- [ ] PR merge verified (`gh pr view --json state,mergedAt`)
- [ ] proof.md finalised (PR URL + merge date appended)
- [ ] Moved to final stage
- [ ] Outcome recorded in ticket body (PR link, follow-ups)
- [ ] cd out of worktree; `git worktree remove .worktrees/<id>`
- [ ] `git branch -d <branch>` (`-D` if squash/rebase-merged)
- [ ] `git fetch --prune` + `git worktree prune`
- [ ] `take_ticket action: "release"`
