# Plan — SKILL-037: Review consolidation and remediation-loop contract

*The plan. Not the checklist — reasoning establishes bounded work; the checklist distils it into independently observable actions.*

## Objective

Rewrite the review / execute / verify / closeout / auto skill prose (plus the tool-reference consistency rows and one new prose check) so that: an attestation is authoritative only once every expected independent reviewer has posted on the exact head and every thread on that head is mapped to an `F-###` finding; an in-scope needs-changes finding returns the same ticket/branch/worktree/PR to Implementing through the CORE-121 audited move; execute re-enters on the existing PR; verification failures carry `failure_class` with a routing table; closeout accepts `WAIVED_BY_OPERATOR`; auto transfers expired claims instead of stopping and never forces.

## Starting state

See `research/` for the full survey. In short: CORE-121 (on `origin/main` a8318ea6) already implements claims, `take_ticket transfer|renew`, `move_item reason`, the Review → Implementing attestation rule and `review_round`/`remediation_budget`; `review-attestation.ts` accepts optional `board_sha`, `expected_reviewers`, `threads_snapshot` on the CORE-123 branch (validation: full SHA / non-empty strings / array). The five skills still describe the pre-CORE-121 flow ("leave the ticket in Review", "open a PR", no failure class, occupied ticket = stop, closeout PASS-only). `scripts/verify-skill-prose.mjs` pins many existing sentences (research lists them); the plugin bundle does not pack skills.

## Governing docs

- `docs/functional/frd/FRD-034-durable-goal-control-and-independent-review.md` — **Meets**: review is bound to the exact head with structured findings (AC2); one consolidated review, one in-scope remediation batch on the same ticket/PR, one delta review limited to original findings, changed lines, direct callers/contracts and relevant tests (AC3); only blocker/major, failed required checks, stale review, unmet acceptance or security/destructive risk block merge; verification routes transient / implementation / plan / inconclusive outcomes to bounded next phases (AC4); `review_round`/`remediation_budget` stop unchanged re-audits and preserve minor/note dispositions as residual risk (AC5). The FRD is not modified.
- HZN-008 `context.md` "Interim ownership and remediation rule" — formalised verbatim in intent; the phrase "expected automated reviewer" is narrowed, per the operator's ruling, to the independent reviewer(s) named for the ticket (bots are evidence, never a gate). No new ADR: no architecture decision changes, only the agent procedure.

## Required changes

1. **kanmer-review/SKILL.md**
   - Frontmatter block gains `board_sha`, `expected_reviewers`, `threads_snapshot` (exact CORE-123 names), and the paragraph keeps CORE-123's `board_sha` / `SYNC_REQUIRED` sentence.
   - New section "Expected reviewers and the settle rule": `expected_reviewers` is the set of independent reviewer identities named for this ticket (controller dispatch or operator); the attestation is authoritative only when each has posted on the exact `head_sha`, or is listed in the body as `timeout-absent` with the deadline; Codex / GitHub bot reviews are never expected reviewers and never a gate — their threads on the head are still evidence. A thread that appears on the same head after the attestation makes it non-authoritative: re-gather and **replace**, never append.
   - `threads_snapshot`: one entry per review thread on the head (`{ source, id, resolved, finding }`), and every external thread id maps to an `F-###` finding id (finding ids are never raw GitHub ids).
   - Consolidated review vs delta review: round 0 is the whole PR; after one remediation batch (`review_round` = 1) the delta review is limited to the original findings, changed lines since the reviewed head, direct callers/contracts, and relevant tests; a delta review must not open a new unrestricted audit; only blocker/major, failed required checks, stale review, unmet acceptance or security/destructive risk block merge; dispositioned minor/note is residual risk.
   - Sanctioned needs-changes return: with `needs-changes` bound to the current head and the PR present in the ticket's `prs[]`, the reviewer (or the controller) calls `move_item review → implementing` with a `reason` quoting the blocking finding ids; the ticket keeps its branch, worktree, PR and claim; the move is audited under `## Transitions` and increments `review_round`; when `review_round` already equals `remediation_budget` the move refuses `REMEDIATION_BUDGET_EXHAUSTED` and only an operator (`operator:` reason) may extend. Remove "leave the ticket in Review" and "becomes a linked PR Review ticket"; out-of-scope findings still defer to a linked ticket.
   - Keep pinned sentences: "Replace `scratch/review.md` as one version-aware file", "one gated boundary", `.worktrees/kanmer`.
2. **kanmer-execute/SKILL.md** — new "Re-entry after a needs-changes return" subsection under the resumed-packet lane: the ticket is back in `implementing` with the same recorded branch/worktree and its PR in `prs[]`; call `take_ticket action: "renew"` on resume and before any long command; read the `needs-changes` attestation and work only its findings (plus the plan); commit and `git push` to the existing branch so the same PR updates; never `gh pr create` a second PR; refresh the post-implementation report with a "Remediation round N" section; move `implementing → review` again. Fresh lane step 6 records the PR ref in `prs[]` via `update_item` (required so the store can bind a later needs-changes return). Keep every check-16 sentence verbatim.
3. **kanmer-verify/SKILL.md** — proof frontmatter gains optional `failure_class: implementation | plan | transient | inconclusive` (required whenever `result` is not `PASS`/`WAIVED_BY_OPERATOR`/`NOT_APPLICABLE`); routing table: `transient` → retry in Verifying (default, retryable); `inconclusive` → stay in Verifying, report the unavailable check; `implementation` → controller/operator moves `verifying → implementing` with a `reason` quoting the proof (backward move, audited; same branch/worktree/PR); `plan` → `verifying → preparing` with a reason, the plan is revised before any new implementation. Clarify `PASS` and `WAIVED_BY_OPERATOR` as the only shapes that reach Done, `WAIVED_BY_OPERATOR` only by a human with identity and reason in the body, and that the verifier never writes it. Keep terminal-retirement text verbatim.
4. **kanmer-closeout/SKILL.md** — verified-success shape: "status Done, not archived, final proof result `PASS`, or `WAIVED_BY_OPERATOR` naming the operator and reason in the proof body". Keep retired non-success text and the pausing row verbatim.
5. **kanmer-auto/SKILL.md** — §1.2: a ticket with a **live** foreign claim is dropped/coordinated; an **expired** foreign claim (per `get_execution_packet.claim.state` or `list_items`) is transferred with `take_ticket action: "transfer"` after an `append_scratch` note naming the old controller, the new controller, the recorded branch and worktree; never `force`. Stop predicate 8 becomes "a ticket occupied by another actor's live claim". §3: workers renew their claim on resume and before long commands; a needs-changes review result routes the lane to `kanmer-execute`'s re-entry on the same PR, with `review_round` and `remediation_budget` read from the item; a verification `failure_class` routes per verify's table. New §2 sentence: subagent workers that background a command read its log themselves and never end their turn waiting for a notification. Keep every check-13/14/16 sentence verbatim.
6. **kanmer-tickets/references/tool-reference.md** — attestation section: list `board_sha`, `expected_reviewers`, `threads_snapshot` as optional keys with their validation; proof section: mention optional `failure_class`. Do not edit the `get_status` row.
7. **scripts/verify-skill-prose.mjs** — append check 17 "SKILL-037 remediation-loop contract": review contains `expected_reviewers` + "replaced, not appended"/"never append" + `review → implementing`/`REMEDIATION_BUDGET_EXHAUSTED`; execute contains "never open a second PR"-style sentence and `action: "renew"`; verify contains `failure_class` and all four classes; closeout contains `WAIVED_BY_OPERATOR`; auto contains `action: "transfer"` and no sentence telling a controller to `force`. Add a matching case to `scripts/verify-skill-prose.test.mjs` only if that test enumerates checks (inspect first; if it only runs the script, no change).

## Expected files

| Action | Repo-root-relative path | Responsibility |
|---|---|---|
| Modify | `plugins/kanmer/skills/kanmer-review/SKILL.md` | review contract (change 1) |
| Modify | `plugins/kanmer/skills/kanmer-execute/SKILL.md` | re-entry lane (change 2) |
| Modify | `plugins/kanmer/skills/kanmer-verify/SKILL.md` | failure class + routing (change 3) |
| Modify | `plugins/kanmer/skills/kanmer-closeout/SKILL.md` | accepted shapes (change 4) |
| Modify | `plugins/kanmer/skills/kanmer-auto/SKILL.md` | transfer / renew / logs (change 5) |
| Modify | `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | consistency rows (change 6) |
| Modify | `scripts/verify-skill-prose.mjs` | check 17 (change 7) |
| Inspect | `scripts/verify-skill-prose.test.mjs` | whether a new check needs a test case |
| Inspect | `plugins/kanmer/mcp/kanmer-mcp.cjs` | not regenerated — skills are not packed in the bundle |

## Do not modify

`packages/core/src/merge-gate.ts`, `packages/mcp-server/src/check-pr.mjs`, `.github/workflows/pr.yml`, `apps/gui/src/main/kanmerGit.ts`, the `get_status` row of the tool reference, AGENTS.md (managed block and regate prose), any `packages/*` source, `.worktrees/kanmer`, `.worktrees/core-123`, SKILL.md frontmatter of any skill, the skill roster (stays 12).

## Constraints

- Every sentence pinned by `scripts/verify-skill-prose.mjs` checks 6, 8, 13, 14, 15, 16 must survive verbatim (list in `research/`).
- Check 7: never write a backticked profile id in a sentence that also names a doc type/boundary and a claim verb.
- Field names exactly as in code: `board_sha`, `expected_reviewers`, `threads_snapshot`, `review_round`, `remediation_budget`, `claim_expires_at`, `F-###` finding ids, `take_ticket action: "transfer" | "renew"`, `move_item reason`, error codes `REVIEW_RETURN_NEEDS_ATTESTATION`, `REMEDIATION_BUDGET_EXHAUSTED`, `CLAIM_LIVE`, `CLAIM_NOT_OWNED`.
- Prose must not promise enforcement the store lacks (e.g. Verifying → Implementing needs only a `reason`; the settle rule is procedure, not a gate).
- Keep CORE-123's `board_sha` paragraph wording so the branches merge with a localised conflict at most.
- Files are written with Edit/Write; no heredocs with single quotes; `MSYS_NO_PATHCONV=1` for `git show ref:path`.
- One PR. Branch `skill-037-review-remediation-contract`, worktree `.worktrees/skill-037`, from `origin/main`.

## Ordered steps

1. Create the worktree from `origin/main`; take the ticket with branch + worktree.
2. Rewrite `kanmer-review/SKILL.md` (change 1); run `npm run verify:skills` from the worktree (`node scripts/verify-skill-prose.mjs` is path-independent) — expect check 15 pass.
3. Edit `kanmer-execute/SKILL.md` (change 2); rerun verify:skills — expect check 16 execute regexes pass.
4. Edit `kanmer-verify/SKILL.md` and `kanmer-closeout/SKILL.md` (changes 3–4); rerun.
5. Edit `kanmer-auto/SKILL.md` (change 5); rerun — checks 13/14/16 pass.
6. Edit the tool reference (change 6).
7. Add check 17 to `scripts/verify-skill-prose.mjs` (change 7); inspect its test; run `node --test scripts/verify-skill-prose.test.mjs`.
8. From the **main checkout** (`C:\Users\Alex\Documents\GitHub\kanmer`, not the worktree) — no: `plugin:check` must run where the build happens; since no bundle changes, run `npm run verify:skills` and `npm run verify:agents-block` in the worktree and record that `plugin:check` is left to the hosted rail (worktree refusal is by design, MCP-007). If the main checkout is clean enough to run `npm run plugin:check` without touching its tree, run it there read-only and record the exit.
9. Tick the checklist, write the post-implementation report, `update_item` with commit + PR ref, push, `gh pr create` with `Kanmer: SKILL-037`, move `implementing → review`.

## Acceptance checks

- `npm run verify:skills` exits 0 with "ALL CHECKS PASSED" including the new check 17.
- `npm run verify:agents-block` exits 0 (regression).
- `node --test scripts/verify-skill-prose.test.mjs` exits 0.
- `git diff --stat` touches only the Expected files.
- Golden scenarios from the ticket are satisfied by prose walkthrough in the post-implementation report: (a) reviewer waits for expected reviewers, attestation lists their threads in `threads_snapshot`, later thread on same head → attestation replaced; (b) needs-changes → `move_item review → implementing reason` → execute re-entry pushes to the same PR → delta review → merge with `review_round` = 1.
- No production caller / runtime artefact / schema applies (documentation-only change); the bundle is unchanged and this is stated in the report.

## Commands

- `node scripts/verify-skill-prose.mjs` (cwd: worktree) — focused prose rail.
- `npm run verify:skills`, `npm run verify:agents-block` (cwd: worktree).
- `node --test scripts/verify-skill-prose.test.mjs` (cwd: worktree).
- Post-merge (`kanmer-verify`, detached worktree at merge SHA): `npm run verify:skills`, `npm run verify:agents-block`; hosted `npm run verify` is authoritative for `plugin:check`.

## Failure and deviation rules

Stop and report: a pinned prose check that cannot be satisfied without changing a pinned sentence (do not edit the check to make it pass unless the change is the documented reason for check 17); any need to touch a CORE-123-owned file; any scope growth beyond the five skills + reference + script (split via kanmer-tickets); a `verify:agents-block` failure caused by the managed block (would mean the block owns changed text — then use the documented script rather than hand-editing).

## Stop condition

PR open with a `Kanmer: SKILL-037` footer, ticket in Review, post-implementation report written. Do not review, merge, verify, close out, release the claim, or start another ticket.
