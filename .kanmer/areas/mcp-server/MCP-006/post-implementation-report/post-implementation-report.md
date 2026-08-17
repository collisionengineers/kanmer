# Post-implementation report — MCP-006

*The report. Not the proof — this is the author's **claim**, written before merge; proof is **evidence**, gathered after.*

## Summary

`update_group(id, title?, body?, archived?, expected_updated?)` is registered on
the MCP surface, taking it from 29 tools to **30**. The core method it delegates
to already existed and already had the no-op rule; the one genuine core addition
is `expectedUpdated`, ordered exactly as `updateItem`'s — token stripped off the
patch before the spread, conflict checked *before* the no-op short-circuit, the
rest pruned of `undefined` — because each of those three guards a real, silent
data bug in `updateGroup` as it stood. `updateGroup` also had **zero** unit
coverage; it now has nine tests, one per guarantee. Two tool descriptions that
described operations the surface did not offer (`list_groups`' "archiving is how
a group is retired", `set_group_doc`'s impossible "edit that through
create_group's body") now point at the tool that performs them, and the error at
`groups.ts:173` — which already told users to "edit it with `update_group`
instead" — finally names something real. `kind` is deliberately not patchable.
No GUI change was needed: `kanmer:updateGroup` already exists end to end and the
new core field is optional, so every call site stays assignable.

## Changes

| File | Change | Why |
|---|---|---|
| `packages/core/src/store.ts` | modified — `updateGroup` gains `expectedUpdated`; ordering rewritten to mirror `updateItem`; `pruneUndefined` on the patch | Three silent bugs, not one. The group frontmatter schema is `.passthrough()` and `serialiseGroup` emits any hand-added key, so a token left on the patch would be **written into the group's file**. Conflict-after-no-op would let a stale token **silently succeed** whenever the patch happened to change nothing. `serialiseGroup` skips `undefined`, so an unpruned `title: undefined` would **erase `title:`** from the frontmatter. |
| `packages/core/src/store.ts` | modified — `conflictError` widened from `current: Item` to structural `{ updated: string; body?: string }` | So a `Group` can be passed. Everything it needs is `updated`, plus `body` to drop from the reported frontmatter. **The message string is untouched, byte for byte** — its wording is contract, matched by `store.test.ts` and `smoke.mjs` (`/Conflict/`). |
| `packages/core/src/store.test.ts` | added — a nine-test `updateGroup` block | It had no coverage at all. One test per guarantee: rename round-trip, archive/unarchive with members untouched, no-op does not bump `updated` or rewrite the file, stale token rejected, **stale token rejected even on a no-op patch** (the ordering test), token never reaches the frontmatter (asserted against file bytes), explicit `undefined` does not erase, unknown id refused, one activity entry. |
| `packages/mcp-server/src/index.ts` | added — `update_group` in the Groups block after `create_group` | The tool. Rest-spread handler (`{ id, expected_updated, ...patch }`) so absent optionals never reach core as explicit `undefined`. Annotations `readOnlyHint:false, destructiveHint:false, idempotentHint:true`. |
| `packages/mcp-server/src/index.ts` | modified — `list_groups` and `set_group_doc` descriptions | Both described operations no tool could perform. `list_groups` now names `update_group(archived: true)`; `set_group_doc` now says "edit that with update_group instead", matching the error core already throws. |
| `packages/mcp-server/src/smoke.mjs` | modified — count `29 → 30`, `update_group` in the existence list, 13 new scenario checks | The ticket's own acceptance list, over real stdio: rename visible in `get_group`, members survive it, `kind` not patchable, no-op leaves `updated`, stale token conflicts, token never persisted, archive drops it from `list_groups`, `include_archived` returns it, members untouched, unarchive restores, unknown id refused. |
| `packages/mcp-server/src/smoke-protocol.mjs` | modified — count `29 → 30` | Asserted once per protocol version, in a loop. |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | added — `update_group` row in the Write table; `set_group_doc` row updated | `plugin:check` fails in both directions on name drift. The `set_group_doc` row carried the same impossible advice as its description. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | regenerated | `plugin:check` byte-compares it against a fresh build, and it is what installed plugins actually run. |
| `docs/functional/frd/FRD-001-groups.md` | modified — G5 | The spec half of the gap. See Governing docs. |
| `docs/functional/frd/FRD-022-mcp-server-surface.md` | modified — R1 and the Phase-0.2 R1 bullet | See Governing docs. |
| `AGENTS.md` | modified — §5 only | Said 24 tools and omitted all five existing group tools. See Governing docs. |

## Governing docs

- **`docs/functional/frd/FRD-001-groups.md` — modified (G5), authorized.** The
  ticket body asks for it ("Update FRD-001 G5 (it enumerates the surface)") and
  the operator confirmed. G5 enumerated the group tool surface verbatim with no
  update in it, which is why this was a spec gap as much as a code gap. It now
  carries `update_group(id, {title?, body?, archived?, expected_updated?})`,
  states that this is how **G4's** retirement is performed and that it is the only
  way to edit a group's own `<ID>.md`, and records why `kind` is excluded (G1/G2
  allocate the id from the kind's prefix). **G4 is met, not changed** — archiving
  stays the retirement path, reversible, members untouched, and the smoke
  scenario asserts all three. **G3 is met** — membership is absent from the patch
  surface and both the description and the reference say membership rides
  `update_item(groups: [...])`.
- **`docs/functional/frd/FRD-022-mcp-server-surface.md` — modified (R1 + the
  Phase-0.2 note), authorized.** R1's Write inventory gains `update_group`. The
  Phase-0.2 "verified against code" R1 bullet was stale in three separate ways,
  not one: the count (24 vs 30), the claim that the group tools were absent, and
  the claim that the column tools still accepted `kind: status|area|priority`
  (`columnKindEnum` is `z.literal("area")`, `index.ts:215` — that Phase 3 delta is
  done). The bullet was rewritten from the code rather than having its number
  patched. **R2 met** — annotations match `update_item`; `destructiveHint` stays
  on exactly `delete_item` and `remove_column`, because FRD-001 G4 makes archiving
  the explicitly *non*-destructive path and it is reversible. **R3 met** — the
  description says what is patchable, that `body` replaces rather than merges,
  that a no-op does not bump `updated`, that `kind` cannot change **and why**, and
  where membership lives. **R6 met** — the reference row, the rebuilt bundle and
  both smoke counts all move in this PR.
- **`docs/functional/frd/FRD-023-agent-skills-system.md` R5** (not in `refs`, but
  it governs the rail) — **met**: the tool reference moved in the same change.
- **`AGENTS.md` §5** — per the operator's default, fixed properly rather than
  minimally: `24 → 30`, per-category counts, and all six group tools placed in the
  Read/Write lists. Adding one line to a list already wrong by five would have
  left it wrong by five. `git diff AGENTS.md` was inspected before committing and
  touches nothing outside §5.
- **No new ADR.** Every choice here applies an existing FRD or `update_item`'s
  established convention; nothing is a new design decision.

## Risks / follow-ups

- **`plugin:check` has not run yet.** It refuses inside a linked worktree by
  design (MCP-007, path-based, no bypass — `npm install` in the worktree does not
  satisfy it). Its **name-comparison half was reproduced by hand** here: 30
  registered, 30 documented, no drift in either direction. Its **byte-comparison
  half is genuinely deferred to verify**, on merged main, from the main checkout.
  Mitigation taken: the committed bundle was searched for embedded absolute paths
  and has none (the three `.worktrees` hits are source string literals), so a
  rebuild elsewhere should be byte-identical.
- **`kind` is ignored, not rejected.** The MCP SDK parses arguments with a
  non-strict `z.object`, so an unknown `kind` argument is silently stripped rather
  than erroring. The smoke check asserts the honest outcome — the group is still
  `epic` afterwards. Worth a reviewer's eye: this is SDK-wide behaviour, not
  specific to this tool.
- **Nothing mechanically verifies tool *descriptions*.** `plugin:check` compares
  names only (it stops reading at `## Field semantics`), which is exactly how the
  two misleading descriptions survived this long. Two of the three files changed
  here are prose a machine will not check. Parked as its own ticket in
  `open-questions`; FRD-022's own Phase-0.2 note already flags it.
- **The conflict message says "Re-read the **item**" even for a group.**
  Deliberately left: the wording is contract, asserted by tests and smoke.
- **Parked, unchanged, all recorded in `open-questions`:** the GUI still renders a
  group's title and body read-only (`GroupView` only exposes Archive/Unarchive),
  so after this an *agent* can rename a group but a *human* cannot;
  `updateGroup` still logs one `update` activity entry with `field: "group"`
  rather than per-field entries.

## Verification hand-off

On merged `main`, **from the main checkout** (not a worktree):

1. `npm run build && npm run plugin:check` — the one thing this PR could not
   self-check. Expect a pass: the tool-reference row matches the registration in
   both directions and the committed `kanmer-mcp.cjs` is byte-current against a
   fresh build. A byte mismatch here means `npm run plugin:build` and a follow-up
   commit, nothing worse.
2. `npm test` — expect green; core carries 241 tests including the nine new
   `updateGroup` ones, and `check:manual` must stay "up to date (12 chapters)"
   since FRD-001 was edited below its first `## `.
3. `npm run typecheck` — expect clean across core, mcp-server, ui and gui.
4. `npm run smoke:protocol` — expect 26/26 and **30 tools on all three protocol
   versions**.
5. `KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs node
   packages/mcp-server/src/smoke.mjs` — expect **156/156**. This is the
   behavioural evidence for the ticket's acceptance list; the 13 `update_group`
   checks are the last block before `delete_item`.
6. Optional, and the nicest proof available: call `update_group` **from a live
   MCP session** to rename a real group — the tool exists precisely because
   renaming HZN-003 had to bypass the tool layer.

`kanmerGit.test.ts` is a known flake under load (pre-existing, GUI-085) — if it
fails, rerun it alone with `--testTimeout=30000` and move on.
