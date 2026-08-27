# Files — SKILL-037

*The files document. Not the research — this is the **surface area** of the change, not the findings behind it.*

## Where the change lands

| Path | Why |
|---|---|
| `plugins/kanmer/skills/kanmer-review/SKILL.md` | Add `expected_reviewers` + settle rule, `board_sha`/`threads_snapshot` fields, mandatory external-thread → `F-###` mapping, consolidated vs delta review scope, `review_round`/`remediation_budget` handling, and the sanctioned needs-changes return (Review → Implementing with `reason`, same PR/worktree). Remove "leave the ticket in Review" and "becomes a linked PR Review ticket". Risk: check 15 regexes; CORE-123 touches the same frontmatter paragraph (merge overlap). |
| `plugins/kanmer/skills/kanmer-execute/SKILL.md` | Re-entry lane after a needs-changes return: resume packet, renew claim, push to the existing PR, never open a second PR; renew before long commands; PR ref recorded in `prs[]` so the store can bind the attestation. Risk: check 16's six execute regexes must survive verbatim. |
| `plugins/kanmer/skills/kanmer-verify/SKILL.md` | Proof gains `failure_class: implementation \| plan \| transient \| inconclusive` for non-PASS; routing table implementation → Implementing, plan → Preparing, transient → retry in Verifying, inconclusive → stay and report; PASS / WAIVED_BY_OPERATOR semantics aligned with closeout. Risk: check 16 retirement regexes. |
| `plugins/kanmer/skills/kanmer-closeout/SKILL.md` | Accepted terminal shape for Done accepts `PASS` **or** `WAIVED_BY_OPERATOR` (operator identity + reason in proof body). Risk: check 16 closeout regexes. |
| `plugins/kanmer/skills/kanmer-auto/SKILL.md` | Expired foreign claim → `take_ticket action: "transfer"` (+ scratch note), live foreign claim → stop; never `force`; workers renew claims; subagent workers read their own background logs; remediation return handled as a lane event (review → implementing → execute re-entry) with `review_round`/budget respected. Risk: checks 13/14/16 pin many sentences verbatim. |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | Consistency only: attestation section lists `board_sha`, `expected_reviewers`, `threads_snapshot` as optional fields; proof section mentions `failure_class`. Do not touch the `get_status` row (CORE-123 owns it). |
| `scripts/verify-skill-prose.mjs` | Add a check pinning the new contract (settle rule, same-PR return, `failure_class`, transfer-not-force) so it cannot drift silently, mirroring how checks 15/16 pin earlier contracts. Optional if time-boxed; the ticket's Verification asks only that the script passes. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `packages/core/src/store.ts` 802–870 (`backwardMoveEffects`) | Exact refusal codes and the binding rule: attestation `pr` must equal or be the suffix (`/<pr>`) of an entry in `prs[]`; `review_round` increments; `operator:` bypasses and raises the budget. Prose must not promise anything the store does not enforce. |
| `packages/core/src/store.ts` 1059–1130 (`transferTicket`, `renewTicket`) | Transfer keeps branch/worktree/`taken_at`; live claims refuse `CLAIM_LIVE`; renew refuses `CLAIM_NOT_OWNED` for a foreign claim. |
| `packages/core/src/types.ts` 356–420, 584–612 | Field names (`claim_expires_at`, `claim_controller`, `review_round`, `remediation_budget`), 30-minute default, `isOperatorReason` = `/^operator:\s*\S/`. |
| `packages/mcp-server/src/index.ts` 1211–1250 | `move_item reason` and `take_ticket` action enum/descriptions — quote these names exactly. |
| `packages/mcp-server/src/execution-packet.ts` 65–80, 482–549 | Packet `claim` block; resumed packets only in `implementing`; expired-claim refusal text names transfer. |
| `packages/core/src/review-attestation.ts` (main) + `git diff origin/main origin/core-123-merge-gate-board-sync -- packages/core/src/review-attestation.ts` | Required vs optional attestation keys and their validation; `F-\d{3,}` finding ids. |
| `git show origin/core-123-merge-gate-board-sync:plugins/kanmer/skills/kanmer-review/SKILL.md` | The one-paragraph CORE-123 insertion the rewrite must stay compatible with (`board_sha` from `get_status.boardSync.localSha`, `SYNC_REQUIRED`). |
| `scripts/verify-skill-prose.mjs` (checks 6, 7, 8, 13–16) | The pinned sentences listed in `research/`; run `npm run verify:skills` after every file edit. |
| `.kanmer/groups/HZN-008/context.md` "Interim ownership and remediation rule" | The operator-approved rule text being formalised. |
| `docs/functional/frd/FRD-034-durable-goal-control-and-independent-review.md` | Delta-review scope definition and merge-blocking criteria to quote. |

## Ripple effects

- `npm run verify:skills` (prose checks) and `npm run verify:agents-block` (regression; the managed block is not edited).
- `npm run plugin:check` parses SKILL.md frontmatter strictly — frontmatter is untouched, but run it from the main checkout anyway (refuses in a linked worktree).
- `scripts/verify-skill-prose.test.mjs` if a new check is added.
- Installed skill copies under `C:\Users\Alex\AppData\Local\Programs\Kanmer\resources\plugins\kanmer\skills` are refreshed by `kanmer-setup` at the next release, not by this PR.
- No MCP bundle change (`plugins/kanmer/mcp/kanmer-mcp.cjs` untouched), no core/server code.

## Out of scope

- `packages/core/src/merge-gate.ts`, `packages/mcp-server/src/check-pr.mjs`, `.github/workflows/pr.yml`, `apps/gui/src/main/kanmerGit.ts`, the `get_status` tool-reference row, AGENTS.md regate prose — CORE-123's lane.
- Making `expected_reviewers`/`threads_snapshot`/`failure_class` schema-required in core (would break older attestations/proofs; belongs to a later core ticket if wanted).
- Any automated enforcement of the settle rule or delta-review scope in the store; CORE-118/SKILL-036 territory.
- AGENTS.md managed block text (kanmer-setup owns it; unchanged because its rules remain true).
- The GUI manual and Codex/GitHub bot review integration (operator has ruled bots are not part of the workflow).
