# Files — SKILL-039

*Surveyed at `main` = `7e114cd1`. Two tables; the second is the one that earns
its keep.*

## Where the change lands

| Path | Why |
|---|---|
| `packages/core/src/review-attestation.ts` | `:32` `DISPOSITIONS` gains `obsolete-after-change`; `:74` reason condition gains it. The single source of truth for the attestation schema — `check-pr.mjs` and the store both read this parser. |
| `packages/core/src/review-attestation.test.ts` | 47 lines today. New `describe` proving: the value is accepted; an unknown value is rejected; the value without a `reason` is rejected. |
| `packages/core/src/merge-gate.test.ts` | One row in the `eligible` non-blocking array (`:720–727`) proving a `blocker`/`obsolete-after-change` finding does not block, in both `strict` modes. Proof that `merge-gate.ts` needs no change. |
| `plugins/kanmer/skills/kanmer-review/SKILL.md` | New `### Root-cause classification` at `:144`; enum + reason rule at `:212–214`; board-push re-check and the `required_conversation_resolution` load-bearing statement in `## Decide and merge` (`:284–291`). |
| `plugins/kanmer/skills/kanmer-verify/SKILL.md` | Workflow step 1 (`:16–17`) gains `reconcile_ticket` dry-run → `apply_reconciliation` as the first act on a resumed or suspicious Verifying ticket. |
| `plugins/kanmer/skills/kanmer-closeout/SKILL.md` | `## 0. Gate` (`:20–27`) gains the same reconcile-first sentence before the `gh pr view` verdict. |
| `plugins/kanmer/skills/kanmer-auto/SKILL.md` | `### Active Review and Verifying invariants` (`:712`, reconciliation paragraph `:724–732`) gains the same sentence for the controller. |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | `:395` enum comment and `:401` reason rule. The agent-facing schema reference. |
| `scripts/agents-block-body.mjs` | `:100` rule 22 wording: a convention change lands in the same PR, and the disposition list gains the new value. **Source of truth for the managed block.** |
| `plugins/kanmer/skills/kanmer-setup/SKILL.md` | `:295` — the hand-kept fenced copy of the block body; `verify-agents-block.mjs` compares it byte for byte. |
| `AGENTS.md` | `:78` — regenerated, never hand-edited, via `node scripts/agents-block.mjs .`. |
| `scripts/verify-skill-prose.mjs` | New unnumbered named section pinning each new sentence in review/verify/closeout/auto/tool-reference. |
| `scripts/verify-skill-prose.test.mjs` | One negative fixture: mutate one new sentence in a copied skills tree, assert non-zero exit and the named FAIL. |
| `docs/functional/frd/FRD-034-durable-goal-control-and-independent-review.md` | Append `## Amendment — review budget and root-cause classes (2026-09-01)` after `## Edge cases`, carrying `goal.md` §1–§10 normative text and acceptance tests A–G. |
| `.gitignore` | Add `goal.md`, `.infisical.json`, `skills-lock.json` (operator decision 2026-09-02) — untracked files make `scripts/release.mjs` see a dirty tree. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | **Generated committed artifact.** Core compiles into the bundle, so `npm run plugin:build` must regenerate it and the new bytes are committed. |
| `plugins/kanmer/scripts/agents-block-body.mjs` | **Generated committed artifact.** `build-plugin.mjs` copies it; `check-plugin-sync.mjs` sha256s it against `scripts/agents-block-body.mjs`. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `packages/core/src/merge-gate.ts` | `:278–291` `openBlockingReviewFindings` — only `(blocker\|major) && disposition === "open"` blocks. This is *why* no logic change is needed; read it before assuming the gate needs an allow-list. |
| `packages/mcp-server/src/check-pr.mjs` | `:13` imports `parseReviewAttestation` from `@kanmer/core`; `:79–96` only reshapes it. There is no second enum copy to keep in step — do not add one. |
| `packages/core/src/store.ts` | `:2012` `backwardMoveEffects`, called from `:1870`/`:2110`; `:3611`, `:3728` document the Review → Implementing authority. The budget moves only here — which is the mechanism the new "consumes no budget" list describes. Do **not** change it. |
| `scripts/verify-agents-block.mjs` | `:43` asserts Conduct rule numbers are contiguous; `:160–179` asserts the `kanmer-setup` fenced block equals `BLOCK_BODY` byte for byte. Editing `AGENTS.md` by hand fails this. |
| `scripts/build-plugin.mjs` | `:10` `setupScripts`, `:21–28` the copy loop — the list of generated plugin scripts. |
| `scripts/check-plugin-sync.mjs` | `:44–68` the refusal rule: this checkout must own its `@kanmer/core` resolution. In a worktree, run `npm install` there first, otherwise `plugin:check` (and therefore `npm run verify`) refuses. |
| `scripts/verify.mjs` | `VERIFY_STEPS` is the authoritative rail and already runs `verify:docs`, `verify:skills`, `verify:agents-block`, `plugin:check` and four smokes. Do not add a step. |
| `scripts/verify-docs.mjs` + `scripts/check-doc-structure.mjs` | Prove that `verify:docs` validates only `docs/manual/*` and the doc-structure mirror — no FRD heading rules. The amendment heading is unconstrained. |
| `docs/functional/frd/FRD-011-backlog-list-view.md` | `:45` `## Amendment (GUI-070)` — the existing precedent for amending a shipped FRD in place. |
| `plugins/kanmer/skills/kanmer-review/SKILL.md` | `:75–85` already states the Codex/bot rule, `:213–221` the `threads_snapshot` shape (no `outdated` field), `:245–252` the `required_conversation_resolution` obligation. Reference these, do not duplicate them. |
| `plugins/kanmer/skills/kanmer-auto/SKILL.md` | `:622–640` `### Push the board before trusting a gate` — the exact wording (and the `get_status.boardWorktree.expectedBranch` rule) that `kanmer-review` must mirror at `:630–631`. |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | `:26` `reconcile_ticket` args/semantics, `:124` `apply_reconciliation` args (`id`, `expected_revision`, `reason?`, `controller?`). The new skill sentences must use these exact names. |
| `goal.md` (untracked, repo root) | §1–§10 is the normative text being moved into the FRD; §10 A–G are the acceptance tests. Once ignored, it stops being an accidental release blocker. |

## Ripple effects

- **Tests:** `packages/core/src/review-attestation.test.ts` (three new cases),
  `packages/core/src/merge-gate.test.ts` (one new row),
  `scripts/verify-skill-prose.test.mjs` (one negative fixture). No existing
  assertion is weakened or deleted.
- **Generated committed artifacts:** `plugins/kanmer/mcp/kanmer-mcp.cjs` and
  `plugins/kanmer/scripts/agents-block-body.mjs`, both refreshed by
  `npm run plugin:build` and verified by `npm run plugin:check`.
- **`AGENTS.md`** is regenerated output of `scripts/agents-block-body.mjs`.
- **Downstream tickets:** the FRD amendment's acceptance tests A–G become
  golden-board scenarios owned by CORE-119. SKILL-039 writes them down; it does
  not implement them.
- **The CI gate** (`kanmer-gate` → `check-pr.mjs`) accepts the new disposition
  the moment core is rebuilt; no workflow file changes.

## Out of scope

- `packages/core/src/merge-gate.ts` — no logic change (proved by the new test row).
- `packages/core/src/store.ts` / `backwardMoveEffects` — behaviour unchanged;
  the skills only *state* its existing property.
- Any new attestation field (`outdated`, `superseded_by`), tool, stage, profile,
  gate or `threads_snapshot` key. The ticket allows one enum value and nothing more.
- `MASTERPLAN.md:77` — a historical retro paragraph, not a live contract, and
  no script validates it.
- `packages/mcp-server/src/smoke.mjs` — its fixture uses `accepted-risk` and
  `deferred-to-ticket`, both still valid.
- Golden-board implementation of tests A–G (CORE-119).
- Correcting `AGENTS.md` §10 step 6's stale "`plugin:check` refuses inside a
  worktree" prose — real but unrelated; note it, do not fix it here.
