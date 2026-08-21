# Post-implementation report

Commit `130f837` on `skill-001-roster-sweep`. 13 files, 12 skills remaining.

## File changes

| Path | Change |
|---|---|
| `kanmer-import/` | Deleted (46 lines). |
| `kanmer-research/SKILL.md` | Rewritten: Preparing, `files/`, folder-documents, group context, `get_doc_gates` as the authority. |
| `kanmer-research/assets/impact-template.md` | Renamed `files-template.md` — the reference had to resolve; its **content** is SKILL-002. |
| `kanmer-plan/SKILL.md` | Research and planning share Preparing, so there is no move between them; one-gated-boundary warning. |
| `kanmer-review/SKILL.md` | 4-doc set → scratch; ripple effects read from `files`; import delegation dropped. |
| `kanmer-auto/SKILL.md` | Per-ticket `get_doc_gates`; profile-partitioned lanes; wave partitioning on `files`. |
| `kanmer-tickets`, `kanmer-groom`, `kanmer-execute`, `kanmer-setup` | Priority refs, table rows, descriptions. |
| `packages/mcp-server/src/index.ts` | `move_item` description: the one-gated-boundary rule. |
| `tool-reference.md`, `README.md` | Follow. |

## Against the governing docs

**ADR-0009** is why `move_item`'s description is in this commit: tool
descriptions outrank skills, so correcting the skills while leaving the
description advertising the removed freedom would have put the contradiction in
the *authoritative* layer.

**FRD-023 R1–R3** — gate prose deleted in favour of `get_doc_gates`; each skill
now says the answer is per-ticket rather than restating a pipeline.

## Three things found by doing rather than reading

1. **kanmer-review's documents do not exist.** All four ids are rejected by
   `set_ticket_doc`. Found while actually running the skill on GUI-005.
2. **kanmer-auto was profile-blind** — it would drive a `spike` through the full
   feature pipeline, and after CORE-011 that now errors rather than merely
   wasting work.
3. **kanmer-execute's description contradicted its own body**, claiming it
   writes `proof.md` when the body correctly defers proof to `kanmer-verify` on
   merged main.

## Nearly broke something

`docs_todo` and `link_doc` read like v2 residue and appear in seven skills.
Both are live — `docs_todo` still satisfies the governing-doc requirement
(FRD-002 P4). A pattern-matched sweep would have silently removed the only way
a ticket without a governing doc can leave Backlog. They are excluded from the
exit grep on purpose, with a note saying why.

## Scope held

SKILL-001 blocks six other tickets, so it stops where they begin. `kanmer-setup`
carried the most residue and got only its stage list and priority references —
reconciliation is SKILL-004 and the AGENTS block is SKILL-005. The template
*contents* are SKILL-002; only the filename moved here, to keep the reference
resolvable.

## For review

**`plugin:check` cannot verify the important half of this.** It compares tool
names and bundle bytes only, so a stale tool description passes green. The
`move_item` description and `tool-reference.md` were matched by hand and want a
human's eye.

**Two skills still name stages inside the AGENTS block** (`kanmer-setup` lines
112/114). Deliberate: `verify-agents-block.mjs` asserts byte-identity with
`scripts/agents-block.mjs`, so changing one without the other fails the build.
That pair is SKILL-005's whole job. Until it lands, a freshly set-up repo still
receives v2 operating instructions — worth knowing, since SKILL-005 is now the
highest-value remaining skill ticket.

## What kanmer-verify should run

`ls plugins/kanmer/skills | wc -l` = 12; README rows = 12; the exit grep clean
except the two AGENTS-block lines and one verb; `docs_todo` still in 7 skills;
`verify:agents-block`; `plugin:build` + `plugin:check`; both smokes; full tests.

## Current-base reconciliation

The original scoped implementation is already merged into the current base: `130f837e34119af80532b4f5ccb17add896c56c8` is reachable through merge `8af1991c8350ae4bf7b44532dd434ee24ce7b8e4`, and the fresh branch starts at `cfd2e35aa7fbff1807fccd32caadf64442b2c70a`. No duplicate source changes were introduced. The existing PR #15 remains the traceable delivery for this ticket.

Fresh current-base evidence:

- `npm run verify:skills` exit 0: all 13 checks passed, including the 12-skill roster, zero semantic gate-rule violations, profile-aware routing, template contracts, and durable auto-run contracts.
- `npm run verify:agents-block` exit 0: 31/31 checks passed.
- `npm run test:scripts` exit 0: 79/79 passed.
- `npm run typecheck` exit 0 across core, MCP server, UI, and GUI.
- Linked-worktree `npm run plugin:check` initially exited 1 because `@kanmer/core` resolved to the main checkout; this failure is retained. After `npm install --ignore-scripts --no-audit --no-fund` created local workspace links, `npm run plugin:build` exit 0 and `npm run plugin:check` exit 0 (30 tools match, bundle bytes match, 12 skill frontmatters parse). The generated bundle was restored because this reconciliation has no source delta.

The broad historical grep remains intentionally superseded by `verify-skill-prose.mjs`: ordinary words such as planning and the AGENTS-block residue owned by SKILL-005 are not v2 stage/gate rules. `docs_todo` and `link_doc` remain live and were explicitly verified. Scope remains limited to SKILL-001; no SKILL-002/003/004/005 prose or unrelated provider work was changed.
