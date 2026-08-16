# Files — SKILL-014

*The files document. Not the research — this is the **surface area** of the change, not the findings behind it.*

Every path is under `plugins/kanmer/skills/` unless stated. This is a
documentation change: no `packages/` source is touched, so no rebuild is implied
except the plugin bundle's skill copy.

## Where the change lands

### The twelve SKILL.md files — workflow + hand-off

| Path | Why |
|---|---|
| `kanmer-research/SKILL.md` | already 1–6 with a `kanmer-plan` hand-off; the reference shape. Light touch only. |
| `kanmer-verify/SKILL.md` | already correct end-to-end — the model for the ending. Light touch only. |
| `kanmer-plan/SKILL.md` | has 1–7; ends on a gate note instead of the hand-off to `kanmer-execute`. |
| `kanmer-execute/SKILL.md` | numbered only inside `## Finish`; needs the whole skill ordered, ending on `kanmer-review`. |
| `kanmer-review/SKILL.md` | numbering is per-section; needs a skill-level order, must end on `kanmer-verify`. **Also carries the false claim at :48** and is the one moving skill that never calls `get_doc_gates`. |
| `kanmer-closeout/SKILL.md` | 0–3 exist; the file ends on an edge-case table. Terminal skill — its ending says the pipeline is done, not who is next. |
| `kanmer-auto/SKILL.md` | §1–5 exist; it is the orchestrator, so its ending names the phase skills it drives. |
| `kanmer-groom/SKILL.md` | 1–4 exist; ends on its report step. |
| `kanmer-setup/SKILL.md` | 1–7 exist and it routes correctly. **Highest-risk file**: it holds one of the two `BLOCK_BODY` copies. |
| `kanmer-tickets/SKILL.md` | no ordered workflow; it is the router and holds the routing table. Service ending. |
| `kanmer-docs/SKILL.md` | no ordered workflow; service skill called from setup/plan/research. |
| `kanmer-report/SKILL.md` | no ordered workflow; read-only, two modes, no successor. |

### The stale vocabulary

| Path | Why |
|---|---|
| `kanmer-tickets/references/tool-reference.md` | six stale passages at lines 53, 65–67, 73, 107, 110, 119 — `priority`, the seven v2 stages, "format-2", flat doc files, `impact`. The tool table above them is current and must be left alone. |
| `kanmer-plan/assets/plan-template.md:5` | "Written FROM research.md and impact.md" → `files` |
| `kanmer-review/assets/pr-review.md:7` | "impact.md ripple effects" → the ticket's `files` document |
| `kanmer-docs/assets/doc-structure.md:26` | doc-type list names `impact` |

### The AGENTS block — two copies, byte-identical or the rail fails

| Path | Why |
|---|---|
| `scripts/agents-block.mjs` (repo root) | holds `BLOCK_BODY`, the literal actually written into every repo's AGENTS.md |
| `kanmer-setup/SKILL.md` (the fenced block) | the hand-copy of the same bytes |
| `AGENTS.md` (repo root) | this repo's own block, refreshed by running the script |

## Context files

| Path | What it tells the implementer |
|---|---|
| `scripts/verify-agents-block.mjs:146-154` | the assertion that the two `BLOCK_BODY` copies match byte-for-byte. This is why "just edit the skill" fails the rail — and why the rail catches it rather than a user discovering it. |
| `packages/core/src/profiles.ts:17` | the authoritative doc-type vocabulary. `files`, not `impact`. Anything a skill or asset names must appear here. |
| `.worktrees/kanmer/.kanmer/areas/skills/SKILL-012/proof/proof.md` | the measured per-profile gate table, and the reason `kanmer-review/SKILL.md:48` is wrong. Do not re-derive it; it was established against real data and challenged twice. |
| `docs/functional/frd/FRD-023-agent-skills-system.md` | R1 (derive, don't restate), R3 (per-skill voice — do **not** flatten twelve skills into one template), R4 (why cross-skill references to the tool reference are legal), R5 (the release rail). |
| `docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md` | the tier ordering. Skills are tier 4; if a workflow step and `get_doc_gates` disagree, the gate wins and the prose is the bug. |
| `kanmer-verify/SKILL.md` (last 4 lines) | the ending to copy. |

## Ripple effects

- **`npm run plugin:build`** copies `plugins/kanmer/skills/` into the bundle;
  `plugin:check` compares bytes. A skills edit without a rebuild fails the check
  — and [[SKILL-011]] proved the reverse failure mode too, so build at the repo
  root, never inside a worktree (AGENTS.md gotcha 8).
- **`npm run verify:agents-block`** fails on any `BLOCK_BODY` divergence.
- **`.claude/skills/`** is this repo's *installed* copy and is gitignored
  (`.gitignore:41`). It does not update itself and the installer only ever adds
  — it still carries `kanmer-research/assets/impact-template.md`, deleted from
  source. Re-syncing it is the operator's next step, not this ticket's.
- No test asserts skill prose. The verification for this ticket is greps, and
  they must be run and recorded rather than assumed.

## Out of scope

- **Rewriting what the skills say about their work.** This ticket normalises
  order and hand-off and corrects false statements. FRD-023 R3 protects each
  skill's own voice, and a uniform-tone rewrite would be a different ticket.
- **The `.claude/skills/` re-sync**, and the installer's inability to prune —
  the missing prune belongs with [[CORE-023]].
- **Restoring `kanmer-import`.** It is deliberately gone (FRD-013).
- **Making the review-fix rule enforceable.** ADR-0011 records that it cannot be
  a gate; this ticket only stops the prose from overstating what is enforced.
- **`kanmer-review/assets/pr-*.md` beyond the `impact` line.** Those four assets
  describe documents `set_ticket_doc` now rejects; whether they should be deleted
  or rewritten as scratch templates is a real question and a separate ticket.
