# Plan — MCP-006: Add `update_group` to the MCP surface

*The plan. Not the checklist — this is the **reasoning**; the checklist is the executable distillation of it.*

Written FROM `research` and `files`. Both are current; the only drift since they
were written is line numbers (CORE-023 / MCP-011 / GUI-071 landed), re-verified
below.

## Approach

Register one new Write tool, `update_group(id, title?, body?, archived?,
expected_updated?)`, that delegates to the `KanmerStore.updateGroup` core method
that already exists — and make the one core change that method is missing,
`expectedUpdated`. The alternative shapes were considered and rejected by the
research: a `kind` parameter is excluded because `createGroup` allocates the id
from the kind's prefix, so `EPIC-`/`HZN-` permanently encodes it and a patch
would leave `HZN-003` claiming `kind: epic` (exactly the reason `update_item`
refuses `type`); a `delete_group` is excluded because FRD-001 G4 makes archiving
the retirement path; and a GUI/IPC path is excluded because
`kanmer:updateGroup` already exists end to end and `GroupView` already calls it.
The one genuinely delicate piece is core: `expectedUpdated` must be destructured
off the patch *before* the spread (or the passthrough group schema persists the
concurrency token into frontmatter), the remaining fields must be pruned of
`undefined` (or an explicit `title: undefined` erases `title:` from the
frontmatter, since `serialiseGroup` skips undefined keys), and the conflict
check must run *before* the no-op short-circuit (or a stale token silently
succeeds whenever the patch happens to change nothing) — the same ordering
`updateItem` already uses. `conflictError` is typed to `Item`, so it is widened
**structurally** to `{ updated: string; body?: string }`; its wording is a
contract asserted by `store.test.ts` and `smoke.mjs` (`/Conflict/`) and stays
byte-identical.

The doc/rail surface is larger than the code surface, and its numbers were
**recounted from the code**, not copied from research:

- `grep -c 'registerTool(' packages/mcp-server/src/index.ts` → **29 today**, so
  **30** after this ticket. That is also 12 reads + 16 writes + 2 destructive.
- `smoke.mjs:47` and `smoke-protocol.mjs:160-161` each hard-code `29`.
- AGENTS.md §5 claims **24** and omits all five existing group tools; per the
  operator default it is fixed properly — to 30, with all six group tools listed
  — because adding one line to a list already wrong by five leaves it wrong by
  five.
- FRD-022's Phase-0.2 R1 bullet claims "24 tools registered today, against 29 at
  the v3 end state (+5 group tools)" and that the group tools are absent and the
  column tools still accept `status|area|priority`. All three claims are now
  false in the code (`columnKindEnum = z.literal("area")`, `index.ts:215`). The
  bullet is rewritten to what the code actually says.

## Governing docs

Both linked refs are **Modified**, and both modifications are the ones the
ticket itself asks for — the ticket's premise is that the spec enumerates a
surface that is missing an operation.

- **`docs/functional/frd/FRD-001-groups.md` — Modifies (G5).** G5 enumerates the
  group tool surface verbatim and omits any update, which is the spec half of
  the gap. G5 gains
  `update_group(id, {title?, body?, archived?, expected_updated?})` and a clause
  tying it to G4 ("archiving a group is done through it"). Authorized by the
  ticket body ("Update FRD-001 G5 (it enumerates the surface)") and by the
  operator's instruction. G4's "deleting = archiving" semantics are **met**, not
  changed: the new tool is the first way an agent can perform the archive G4
  already specifies, and it leaves members untouched. G3 is **met**: membership
  stays off the patch surface and the description says so.
- **`docs/functional/frd/FRD-022-mcp-server-surface.md` — Modifies (R1 and the
  Phase-0.2 note).** R1's Write inventory gains `update_group`; the Phase-0.2
  "verified against code" R1 bullet is recounted and corrected. R2 is **met** —
  `readOnlyHint:false, destructiveHint:false, idempotentHint:true`, matching
  `update_item`, because archiving is explicitly the non-destructive path
  (FRD-001 G4) and is reversible, so `destructiveHint` stays on exactly
  `delete_item` and `remove_column`. R3 is **met** — the description states what
  is patchable, that `body` replaces rather than merges, that a no-op does not
  bump `updated`, that `kind` cannot change and why, and that membership rides
  `update_item(groups:[...])`. R6 is **met** — the tool-reference row, the
  rebuilt `kanmer-mcp.cjs`, and both smoke counts all move in this commit.
- **`docs/functional/frd/FRD-023-agent-skills-system.md` R5** (not in `refs`, but
  it governs the rail) is **met**: the tool reference is updated in the same
  change and `plugin:build` + `plugin:check` gate it.
- **No new ADR.** Nothing here is a new design decision: every choice
  (`kind` unpatchable, archive-not-delete, annotations, MCP-only) is an
  application of an existing FRD or of `update_item`'s established convention.

## Steps

1. **Core — `updateGroup` gains `expectedUpdated`** (`packages/core/src/store.ts`,
   `updateGroup` at `:1289`). Signature becomes
   `{ title?, body?, archived?, expectedUpdated? }`. Body order, mirroring
   `updateItem` (`:623-655`): destructure `const { expectedUpdated, ...fields }
   = patch` → `readGroup` → `if (!current) throw` → **conflict check** → `const
   pruned = pruneUndefined(fields)` → `const next = { ...current, ...pruned }` →
   serialise-compare no-op short-circuit → stamp `updated` → write → activity.
2. **Core — widen `conflictError`** (`store.ts:762`) from `current: Item` to
   `current: { updated: string; body?: string }` so a `Group` is accepted. The
   message string is untouched, byte for byte.
3. **Core tests** (`packages/core/src/store.test.ts`) — a new `updateGroup`
   describe/it set, since it currently has **zero** coverage: rename round-trip
   via `getGroup`; archive then unarchive; a no-op patch does not bump `updated`
   (and does not rewrite the file); a stale `expectedUpdated` rejects with
   `/Conflict/` while a fresh one is accepted; an explicit `title: undefined`
   leaves `title` intact (the F6 erase trap); `expectedUpdated` is never written
   into the group's frontmatter (read the file bytes); an unknown id throws.
4. **MCP — register `update_group`** (`packages/mcp-server/src/index.ts`, in the
   Groups block immediately after `create_group`, which ends at `:507`).
   Annotations `readOnlyHint:false, destructiveHint:false, idempotentHint:true`.
   Handler is rest-spread, not named destructuring:
   `write(async ({ id, expected_updated, ...patch }) => ok(await
   store.updateGroup(id, { ...patch, expectedUpdated: expected_updated })))`.
5. **MCP — fix the two lying descriptions.** `list_groups` (`:529`) keeps its
   archiving sentence but now points at `update_group(archived: true)` as the
   way to do it. `set_group_doc` (`:561`) replaces "edit that through
   create_group's body" — impossible advice, `create_group` allocates a new id —
   with "edit it with `update_group`", matching the error `groups.ts:173`
   already throws.
6. **Tool reference row** — add `update_group` to the Write table of
   `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md`, between
   `create_group` and `set_group_doc`. First cell exactly `` `update_group` ``
   or `plugin:check` fails.
7. **Smoke** — `packages/mcp-server/src/smoke.mjs`: `29 → 30` (`:47`), add
   `"update_group"` to the existence list (`:48-58`), and add scenario checks in
   the group block (before the `list_groups` checks at `:1038`): rename visible
   through `get_group`; members and progress survive the rename; a no-op patch
   leaves `updated` unchanged; a stale `expected_updated` errors with
   `/Conflict/`; `archived: true` drops the group from `list_groups` and it
   returns with `include_archived`; member tickets are untouched; unarchiving
   restores it (so the later `list_groups returns both` check still holds).
   `packages/mcp-server/src/smoke-protocol.mjs`: `29 → 30` (`:160-161`).
8. **Docs** — FRD-001 G5; FRD-022 R1 Write list plus its recounted Phase-0.2 R1
   bullet; AGENTS.md §5 (count `24 → 30`, and add the three group reads and the
   three group writes to the Read/Write lists). Nothing else in AGENTS.md —
   `git diff AGENTS.md` is inspected before committing.
9. **Rebuild the bundle** — `npm run plugin:build` (which runs `npm run build`
   first) and commit the regenerated
   `plugins/kanmer/mcp/kanmer-mcp.cjs`. It is a 1.4 MB single-line artifact:
   rebuild it after every rebase rather than trying to merge it.
10. **Rail** — `npm test`, `npm run typecheck`, `npm run plugin:check`,
    `npm run smoke:protocol`, plus `node packages/mcp-server/src/smoke.mjs`
    against the built plugin bundle. `plugin:check` refuses to run inside a
    linked worktree by design (MCP-007), so it is run from the main checkout on
    the merge result.

## Verification

`proof.md` is produced from, in order:

- `npm test` — includes the new `updateGroup` core tests and `check:manual`
  (FRD-001 is edited below its first `## `, so the generated manual chapter must
  not move).
- `npm run typecheck` — the widened `conflictError` and the new patch field
  compile across core, mcp-server and the GUI, whose `updateGroup` call sites
  stay assignable because the new field is optional.
- `KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs node
  packages/mcp-server/src/smoke.mjs` — the behavioural evidence for the ticket's
  own acceptance list: rename visible in `get_group`, archive drops it from
  `list_groups` unless `include_archived`, members untouched, no-op does not
  bump `updated`, stale token rejected.
- `npm run smoke:protocol` — 30 tools on every protocol version.
- `npm run plugin:check` (from the main checkout) — the tool-reference row
  matches the registration in both directions and the committed bundle is
  byte-current.

## Risks / open questions

- **Ordering regression (high).** Conflict-check after the no-op check makes a
  stale token silently succeed. Mitigated by writing the core test for exactly
  that case (stale token + no-op patch) rather than only the stale-token +
  real-change case.
- **Frontmatter corruption (high, silent).** Leaving `expectedUpdated` on the
  patch writes it into the group's frontmatter via the passthrough schema and
  `serialiseGroup`'s "hand-added keys survive" branch; an explicit
  `title: undefined` deletes `title:`. Both are asserted against the file bytes
  in the new core tests, not just against the returned object.
- **Conflict wording (medium).** It is matched by `store.test.ts` and
  `smoke.mjs`. Only the parameter *type* is widened; the string is not touched.
  Note the message says "Re-read the **item**" even for a group — deliberately
  left, because the wording is contract.
- **Bundle merge conflicts (medium).** `kanmer-mcp.cjs` is unmergeable; rebase
  then `npm run plugin:build`, never resolve it by hand.
- **`plugin:check` in a worktree (medium).** It refuses by design (MCP-007);
  settle it from the main checkout, not by working around the refusal.
- **`kanmerGit.test.ts` flakes under load (low, pre-existing, GUI-085).** Rerun
  alone with `--testTimeout=30000` and move on.
- **Nothing verifies descriptions (low).** `plugin:check` compares tool *names*
  only, which is how the two misleading descriptions survived. Review has to
  read them; making the check verify descriptions is parked as its own ticket.
- **No open questions.** `open-questions` is fully resolved: both OPERATOR
  judgement calls were confirmed by the operator (fix AGENTS.md §5 properly;
  correct the FRD-022 count note), and three items are explicitly parked (GUI
  title/body editing, description checking in `plugin:check`, per-field group
  activity).
