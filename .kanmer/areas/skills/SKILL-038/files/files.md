# Files — SKILL-038

*The files document. Not the research — this is the **surface area** of the change, not the findings behind it.*

## Where the change lands

| Path | Why |
|---|---|
| `plugins/kanmer/skills/kanmer-auto/SKILL.md` | §1 step 2 gains the in-roster / out-of-roster blocker distinction (the core defect); §3 gains the numeric `transient` re-run budget and its verbatim refusal (F-005). §4's bytes must not change; §1–§11 numbering must not change. Risk: the `forbiddenGoalClaims` regexes in check 19 use `[^.]*` spans and will fire on careless new wording about budgets and replans. |
| `plugins/kanmer/skills/kanmer-auto/assets/run-state-template.md` | Records the budget: a `transient_retry_limit:` frontmatter field and a `Transient` ledger column. Risk: check 13 pins 11 frontmatter fields and 5 headings, and check 19 pins `\| Replan \|` — adding a column must not disturb either. |
| `scripts/verify-skill-prose.mjs` | Check 19: repair the mis-pinned board-health regex (N-1) and add the new named assertions for the blocked-roster distinction, the transient budget, the new template field and the new ledger column, plus one forbidden-claim rule catching the reinstated board-wide drop. Risk: an over-broad regex that a sibling clause also satisfies re-creates N-1 in a new place. |
| `scripts/verify-skill-prose.test.mjs` | One mutation fixture per new or repaired clause, each asserting `FAIL <its own check name>` **and** `PASS <a sibling's name>`. Risk: a fixture whose anchor string is not byte-exact throws in `edit()` rather than proving anything — `edit()` asserts the anchor first, which is the guard. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `packages/core/src/links.ts:56-78` | `computeBlockedIds` is board-wide and liveness-filtered; `buildLinkIndex`'s `blockedBy` is **not** liveness-filtered. This is why prose must tell the controller to judge each blocker's own `archived`/`status` rather than trusting `blockedBy` membership alone. Read it, do not edit it — CORE-132 owns this tree right now. |
| `packages/mcp-server/src/index.ts:411-415` | `blockedSet()` passes the whole board to `computeBlockedIds`; its comment already says "per the whole board". Confirms `list_items`' `blocked` flag cannot answer the roster question. |
| `scripts/verify-skill-prose.mjs:594-660` | Check 19's `goalContract` array and the `check(name, ok, detail)` contract. Each entry is one named line of output; a name is what the fixtures assert on, so names must stay stable and distinct. |
| `scripts/verify-skill-prose.mjs:770-811` | `forbiddenGoalClaims` and why each name is backed by *every* phrasing that would make it untrue. The new negative rule must follow that shape, and must not match the new positive prose. |
| `scripts/verify-skill-prose.test.mjs:327-345` | `goalFixture` / `skillFile` / `edit` / `expectFail` / `expectPass` — the exact helpers every new fixture must reuse. `edit` asserts the anchor exists, so a stale anchor fails loudly. |
| `scripts/verify-skill-prose.test.mjs:456-505` | The `scopeMutations` table: the canonical anti-absorption pattern — each mutation names both the check it must break and a sibling it must not. |
| `plugins/kanmer/skills/kanmer-verify/SKILL.md:137-160` | `transient`'s definition and routing table. The evidence obligations stay exactly as they are; only the controller's re-run count is bounded, and no fifth `failure_class` is added. |
| `docs/functional/frd/FRD-034-...md:11-21,44-46` | Behaviour already requires the run to record a "retry budget", and AC5 requires budgets that stop repeated unchanged audits. F-005 implements an existing requirement rather than inventing one. |
| `.kanmer/groups/HZN-008/context.md` | The horizon's scope discipline (no new tickets for minor findings), the Windows/CI flake discharge rule, and `required_conversation_resolution: true` on `main`. |

## Ripple effects

- `npm run verify:skills` output grows by the new check-19 lines; its exit code must stay 0.
- `node --test scripts/verify-skill-prose.test.mjs` grows by the new fixtures; all pre-existing tests must still pass unchanged.
- `scripts/check-plugin-sync.mjs` / `check-mcpb-sync.mjs` compare the plugin tree against packaged copies — a skills edit may require the packaged copies to be regenerated or may simply be reported; confirm before claiming the suite is green.
- No TypeScript, no schema, no MCP tool surface, and no board data change, so `packages/*` tests are untouched by the diff.
- `AGENTS.md` is read by check 2 only; it is not edited here.

## Out of scope

- **F-008, the `current.md` pointer race.** Needs a `packages/core` change and only bites under concurrent controllers; CORE-119 is single-controller. Deliberately excluded by the ticket.
- **Any `packages/` edit.** Research established the fix is reachable from existing read-only MCP calls; `packages/core` and `packages/mcp-server` belong to the CORE-132 lane.
- **A fifth `failure_class`.** CORE-131's shipped router depends on exactly four; the transient bound stops the loop without renaming the class.
- **Renumbering or rewriting `## 4. Mandatory stop predicates`** (1877 bytes, sha256 `03796a0e…`) or any `## N.` heading.
- **`scripts/antigravity-plugin-config.test.mjs`**, `.worktrees/kanmer`, `.worktrees/core-128`, `.worktrees/core-132` and every `verify-*` worktree.
- **Adding a skill or changing `EXPECTED_SKILLS` from 12.**


---

## Review remediation amendment — PR #304 exact head `8a909ee97d95a0c50e5102c3c7f88d4c575614ba`

This amendment supersedes only the earlier statements that there is no run-schema change, that `AGENTS.md` is not edited, and that the expected diff has four files. The original research and completed implementation history remain intact.

### Added mutation surface

| Path | Review remediation responsibility |
|---|---|
| `plugins/kanmer/skills/kanmer-auto/SKILL.md` | Before retaining internal dependents, detect directed dependency cycles and self-loops; name the cycle path/members; dispatch none; give every member an explicit blocked disposition. Define schema 3 as the first contract with `transient_retry_limit` and a durable `Transient` count. Refuse active schema 1/2 records under schema-3 assumptions; preserve and terminally close the legacy record under its own schema, then create a distinct schema-3 successor. Unknown/absent schema remains a hard refusal. |
| `plugins/kanmer/skills/kanmer-auto/assets/run-state-template.md` | Stamp `schema: 3`; retain `transient_retry_limit: 2` and the `Transient` ledger column. |
| `plugins/kanmer/skills/kanmer-auto/assets/current-run-template.md` | Stamp `schema: 3`; remain only a pointer to the complete history record, never an in-place migration surface. |
| `AGENTS.md` | Update the canonical `kanmer-auto` inventory and add one concise controller contract covering internal/external blockers, cycle disposition, retry limit 2, and the schema-3/no-in-place-rewrite transition. |
| `scripts/verify-skill-prose.mjs` | Pin cycle detection before retention, explicit blocked/no-dispatch behavior, schema 3, schema-1/2 refusal and no rewrite, both template stamps, and all four AGENTS conventions. |
| `scripts/verify-skill-prose.test.mjs` | Add isolated mutation fixtures for cycles, schema transition/template stamps, and AGENTS. `goalFixture()` must copy real `AGENTS.md`. Every new teardown uses `removeTreeWithRetrySync`. |

### CORE-128 separation

After rebasing onto `add0da7fc17968796f43b3035065de400a4db2d4`, the 15 pre-existing cleanup conversions belong wholly to CORE-128/main and must disappear from PR #304's net diff. The five teardown calls introduced by SKILL-038 remain `removeTreeWithRetrySync(fixture)`. Remove the unrelated paragraph-only reflow from commit `8a909ee`, and do not retain commit prose claiming CORE-128 remediation.

Still out of scope: every `packages/**` path, F-008/current-pointer race, another workflow or tool, new tickets, HZN membership changes, and any live rewrite of HZN-008's schema-1 run.
