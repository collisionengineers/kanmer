## Summary

Rewrote five bullets in `scripts/agents-block-body.mjs`'s `BLOCK_BODY` (the
canonical AGENTS.md managed block), hand-synced the fenced copy in
`plugins/kanmer/skills/kanmer-setup/SKILL.md`, regenerated this repo's own
`AGENTS.md` managed block, added four new checks to
`scripts/verify-agents-block.mjs`, and added a new routing fixture test
(`scripts/agents-block-routing.test.mjs`). The 24 numbered `## Agent conduct`
rules, their 4 group headings, and both board-branch paragraphs are
byte-identical to before. `plugins/kanmer/mcp/kanmer-mcp.cjs` is unchanged
after `npm run plugin:build` (confirmed: no source in `packages/core` or
`packages/mcp-server` was touched, and `git status`/`git diff --stat` show no
change to that file).

Not committed: an AGENTS.md §6/§7 prose sentence outside the managed block.
Conduct rule 24 requires that only when commands/conventions changed; no
command or convention changed here, and `npm run verify:docs` /
`npm run check:manual` both passed without one, so this deviation from the
plan's optional Step 7 is: step skipped, exactly as the plan allowed.

## Exact diff of each bullet

All five edits below are inside `BLOCK_BODY` in `scripts/agents-block-body.mjs`
(and identically in the `kanmer-setup/SKILL.md` fenced copy, and — after
`node scripts/agents-block.mjs .` — in this repo's own `AGENTS.md`).

**1. Proof-branch bullet — replaced**

Before:
```
- Proof is written on merged `main`, after review and the merge, not before.
```
After:
```
- Proof is written on the configured integration branch after review and the merge, not before. Read it from `get_status` → `delivery.integrationBranch` (default `main`); never hardcode a branch name. Ordinary Done means integrated and accepted there. Deployment belongs to a release or an explicitly deployment-scoped ticket and is never a condition of ordinary Done.
```

**2. New first bullet — inserted** (before the `Start every session with get_status…` bullet)

```
- **Resolve the request before starting a workflow.** Explaining code, reviewing a reference the owner supplied, or producing an isolated artifact is direct work: no ticket, no branch, no worktree. Track work when it changes this repo's shipped behaviour or when the owner asks. Then pick the profile by consequence, not size — a two-line change to authorization, schema, release behaviour or irreversible data still owes its profile's evidence. Never bypass a gate through late-stage creation or an empty `custom` profile.
```

**3. Ticket-folder-loading bullet — replaced**

Before:
```
- Read the whole ticket folder before starting — documents are folders (`research/`, `plan/`, …), so there may be several files per type. If the ticket is in a group, read the group's `context.md` too: the constraint binding the batch is written once, there.
```
After:
```
- Read what the current step needs: the ticket body, `get_doc_gates`, the governing decision, the relevant plan/checklist section and the latest proof/review pointer. Documents are folders (`research/`, `plan/`, …) so a type can hold several files — pull older attempts only when a claim or a failure investigation needs them. If the ticket is in a group, read the group's `context.md` too: the constraint binding the batch is written once, there.
```

**4. Skills-order bullet — opening clause replaced, rest unchanged**

Before:
```
- Skills run in this order: kanmer-tickets → -research → -plan → -execute → -review → -verify → -closeout. How far a ticket walks it depends on its profile, so ask `get_doc_gates` rather than assuming every step. Off to the side: -auto (drives that order over many tickets), -docs (governing docs), -groom (fix the board), -report (read-only), -setup (reconcile after a Kanmer update).
```
After:
```
- Skills run in this order **when a tracked ticket walks the full pipeline**: kanmer-tickets → -research → -plan → -execute → -review → -verify → -closeout. Direct work runs none of them. How far a tracked ticket walks it depends on its profile, so ask `get_doc_gates` rather than assuming every step. Off to the side: -auto (drives that order over many tickets), -docs (governing docs), -groom (fix the board), -report (read-only), -setup (reconcile after a Kanmer update).
```

**5. New bullet — inserted** (immediately after the rewritten proof bullet, before `Archive, don't delete…`)

```
- **One heavy verification owner per host.** Full rails, packaging and installer builds serialize behind the named verifier recorded in the repo's operating index. A second agent waits for that run — or reuses a matching completed CI result — instead of starting a competing whole-repository build. Lightweight file checks do not queue behind it.
```

Resulting bullet order (12 bullets total, up from 10): resolve-request-first
(new), session-start, doc-gates-not-board.yml, stages/one-boundary,
gates-constrain-move_item-only, open-questions, read-what-the-step-needs
(rewritten), branch/worktree convention, set_ticket_doc/append_scratch,
proof-on-integration-branch (rewritten), one-heavy-verifier (new),
archive-not-delete, skills-order (opening clause rewritten),
each-skill-names-next.

## Files changed

- `scripts/agents-block-body.mjs` — the five `BLOCK_BODY` edits above.
- `plugins/kanmer/skills/kanmer-setup/SKILL.md` — fenced copy hand-synced
  byte-for-byte to the new `BLOCK_BODY`.
- `AGENTS.md` — regenerated via `node scripts/agents-block.mjs .`; only the
  span between `<!-- kanmer:instructions:start … -->` and
  `<!-- kanmer:instructions:end -->` changed.
- `scripts/verify-agents-block.mjs` — added checks 10-13 (no stale
  "merged main" claim; `delivery.integrationBranch` named; routing +
  heavy-verifier sentences present; deployment-separation sentence present).
- `scripts/agents-block-routing.test.mjs` — new `node:test` file (5 tests):
  each of the five ticket-specified sentences appears exactly once in
  `BLOCK_BODY`; `delivery.integrationBranch` is named and the stale "merged
  main" phrase is gone; the 24-rule numbering is intact and in order; all 4
  group headings (`Scope`/`Build`/`Prove`/`Conduct`) are present. Discovered
  automatically by `scripts/test-scripts.mjs` (enumerates `scripts/*.test.mjs`).
- `plugins/kanmer/scripts/agents-block-body.mjs` — refreshed build output via
  `npm run plugin:build` (byte-copy of the canonical source; not hand-edited).
- `plugins/kanmer/mcp/kanmer-mcp.cjs` — confirmed **unchanged** after
  `npm run build && npm run plugin:build` (no core/server source touched).

Not changed (per plan / ticket "Do not modify"): the 24 numbered conduct
rules and 4 group headings in any of the three copies; both board-branch
paragraphs; `scripts/verify.mjs`, `.github/workflows/pr.yml`,
`packages/mcp-server/src/check-pr.mjs`, `kanmer-verify/SKILL.md`,
`kanmer-execute/SKILL.md`, `kanmer-review/SKILL.md`,
`packages/core/src/reconciliation.ts`, `apps/gui/src/**`, `CLOSEOUT_PLAN.md`.

## Commands run, in order, with exit codes

```
node scripts/verify-agents-block.mjs                → exit 0 (35/35 checks passed, including new checks 10-13)
node --test scripts/agents-block-routing.test.mjs   → exit 0 (4 tests, 4 pass, 0 fail)
npm run verify:skills                                → exit 0 (ALL CHECKS PASSED)
npm run verify:docs                                  → exit 0 (manual up to date, 22 chapters)
npm run check:manual                                 → exit 0 (manual up to date, 22 chapters)
npm run build                                        → exit 0 (core + mcp-server + standalone bundle built)
npm run plugin:build                                 → exit 0 (kanmer-mcp.cjs, agents-block.mjs, agents-block-body.mjs copied)
git status --short                                    → only the intended 6 files (5 modified, 1 new); plugins/kanmer/mcp/kanmer-mcp.cjs absent from the list (unchanged)
git diff --stat -- plugins/kanmer/mcp/kanmer-mcp.cjs → empty (confirms byte-identical)
```

Fresh-clone-only check (per instructions, since `plugin:check` refuses inside
a linked worktree):

```
git clone <worktree> "$TMP/kanmer-fresh-doc028"
cd "$TMP/kanmer-fresh-doc028" && npm ci   → exit 0
npm run build                              → exit 0
npm run plugin:check                       → exit 0 — "plugin-sync OK — 41 tools match, bundle bytes match,
                                              12 skill frontmatters parse, manifests at v0.4.1,
                                              isolated MCP handshake lists 41 tools"
```
The temporary clone was removed after the check.

## Governing docs

- FRD-013 (setup-as-reconciliation): unaffected mechanism; only the block
  body `kanmer-setup` writes changed.
- FRD-023 (agent skills system) R1: `npm run verify:skills` stayed green,
  confirming the new bullets add no per-profile requirement mapping and no
  skill restates a rule `get_doc_gates` already answers.
- FRD-031 (configurable delivery/release state): the proof-branch bullet now
  matches `resolveDelivery`'s documented behavior — `get_status.delivery.integrationBranch`
  (via `resolveDelivery(board)` in `packages/core/src/board.ts:229`, exposed
  at `packages/mcp-server/src/index.ts:777`) defaults to `main` and is never
  hardcoded in the block's prose.

No new ADR: this is a prose-routing change to an existing mechanism, not a
new architectural decision.

## Deviations from the plan

- Step 7 (optional AGENTS.md §6/§7 prose sentence) was **not performed**.
  `npm run verify:docs` and `npm run check:manual` did not demand it, and no
  command or convention changed, so conduct rule 24 does not require an
  AGENTS.md prose update beyond the managed-block regeneration already done
  in Step 3. This is the plan's explicitly allowed "skip and say so" branch,
  not scope creep or an omission.
- No other deviations. All five bullet edits, both mirrors, the four new
  verify-agents-block checks, and the new routing test match the plan
  exactly.

## Stop condition reached

All plan Ordered Steps (1-7, with 7 correctly skipped) are complete; all
Acceptance Checks pass; the fresh-clone `plugin:check` ran and passed. Ready
to push the branch, open the PR, and move to Review.
