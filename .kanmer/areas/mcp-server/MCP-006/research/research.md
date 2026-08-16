# Research — MCP-006: `update_group` on the MCP surface

*The research. Not the files document — this is what you **learned**, not what you will **touch**.*

## Question

What exactly is a group's schema, which of its fields are legitimately patchable
over MCP, and what does an `update_group` tool have to look like to match
`update_item` (including `expected_updated`)? Is this MCP-only, or does the GUI
need an IPC path too?

## Findings

### F1. The group schema is six frontmatter fields plus a body

`GroupFrontmatterSchema` (`packages/core/src/groups.ts:28-38`): `id`, `kind`,
`title`, `archived`, `created`, `updated` — and the schema is
`.passthrough()`. `Group` adds `body` (`groups.ts:43-45`); `GroupWithMembers`
adds `members` / `progress` / `total` / `complete`, all **derived on every read**
(`deriveMembers`, `groups.ts:133-152`) and never stored (FRD-001 G3, ADR-0001).

- Serialisation emits `KEY_ORDER = [id, kind, title, archived, created, updated]`
  and then **any other key present on the object** (`groups.ts:80-91`,
  "hand-added keys survive a round-trip"). A stray key in the patch is therefore
  written into the group's frontmatter — see F6.

### F2. The core method already exists and already has the right shape

`KanmerStore.updateGroup` (`packages/core/src/store.ts:1288-1301`) takes exactly
`{ title?, body?, archived? }`, refuses an unknown id, short-circuits a no-op by
comparing serialised bytes (so `updated` is not bumped), stamps `updated`,
writes atomically and appends one `update` activity entry with `field: "group"`.

- It has **no `expectedUpdated`** — that is the one core change this ticket needs.
- It has **no unit test**: `updateGroup` appears nowhere in
  `packages/core/src/store.test.ts` (the group tests there cover `listItems({group})`
  only, `store.test.ts:265-325`). New behaviour arrives untested unless the plan
  adds tests.

### F3. Core already names the tool that does not exist

`groups.ts:173` refuses writing the group's own file through `set_group_doc` with
*"…is the group's own file; edit it with `update_group` instead."* — an error
message pointing at a tool the surface never registered. Adding the tool makes an
existing message true rather than inventing a concept.

### F4. The GUI needs nothing — the IPC path is already complete

Every layer already exists and is exercised:

- channel `kanmer:updateGroup` — `apps/gui/src/shared/ipc.ts:87`
- typed API `updateGroup(projectId, id, { title?, body?, archived? })` — `ipc.ts:473-477`
- main handler → `requireStore(p).updateGroup(id, patch)` — `apps/gui/src/main/index.ts:762-764`
- preload bridge — `apps/gui/src/preload/index.ts:76`
- renderer client — `apps/gui/src/renderer/src/lib/client.ts:80,131`
- read-only-mode guard list already contains `"updateGroup"` — `readOnly.ts:27`,
  asserted by `readOnly.test.ts:14`
- consumer: the Archive/Unarchive button — `components/GroupView.tsx:71-81`

**So this ticket is MCP-only.** The one GUI-side gap is that `GroupView` exposes
only `archived` — a group's title and body are not editable in the UI (the view
renders them read-only, `GroupView.tsx:87-90`). That is a separate product gap,
not this ticket (see open-questions).

### F5. `update_item` is a precise model, and its ordering matters

Registration `packages/mcp-server/src/index.ts:620-672`; the handler is
`write(async ({ id, expected_updated, ...patch }) => ok(await store.updateItem(id, { ...patch, expectedUpdated: expected_updated })))`
— i.e. snake_case at the tool boundary, camelCase in core.

In `store.updateItem` (`store.ts:623-700`) the order is load-bearing:

1. `const { expectedUpdated, ...fields } = patch` — the token never reaches the file (`:624`)
2. read current (`:645`)
3. **conflict check before the no-op check** (`:646-648`) — a stale
   `expected_updated` is a conflict even when the patch would change nothing
4. `pruneUndefined(fields)` then `changedFields` → return `current` unchanged when
   empty (`:649-655`), so no-ops do not bump `updated`

The shared rejection is `private conflictError(id, current: Item, expectedUpdated)`
(`store.ts:762-769`). Two constraints on reusing it: it is typed to `Item` (it
serialises `current` minus `body` into the message) so it must be widened to
something structural before a `Group` can be passed, and the comment at `:758-761`
says the wording is matched by tests and by `smoke.mjs` (`/Conflict/`) — **do not
change the wording**.

### F6. Two real traps in the naive wiring

`updateGroup` builds `next` as `{ ...current, ...patch }` with no `pruneUndefined`:

- If the tool handler passes explicitly-`undefined` optionals (e.g.
  `store.updateGroup(id, { title, body, archived })` with `title === undefined`),
  `next.title` becomes `undefined`, `serialiseGroup` skips undefined values in
  `KEY_ORDER`, and **`title:` disappears from the group's frontmatter**. Rest-spread
  in the handler (`{ id, expected_updated, ...patch }`) avoids this because zod
  omits absent optional keys — but core should prune defensively, as `updateItem`
  already does (`store.ts:649`).
- If `expectedUpdated` is left on the patch object it is spread into `next`, and
  the passthrough schema plus the "hand-added keys survive" branch in
  `serialiseGroup` will **persist `expectedUpdated:` into the group's frontmatter**.
  It must be destructured out first, exactly as `updateItem` does.

### F7. `kind` is not legitimately patchable; `id`/`created`/`updated`/members are not either

`createGroup` (`store.ts:1250-1275`) resolves the kind against `board.yml`
(`resolveGroupKinds`) and allocates the id **from that kind's prefix** —
`EPIC-001` for `epic`, `HZN-001` for `horizon` (FRD-001 G1/G2). Patching `kind`
would leave `HZN-003` carrying `kind: epic`: the id would still assert one kind
while the frontmatter asserted another, and `list_groups(kind:)` would then
disagree with every id on the board. This is the same reason `update_item` says
*"`type` cannot be changed here — create a new item and archive the old one
instead"* (`index.ts:625`).

The legitimately patchable set is therefore exactly what core already accepts:
**`title`, `body`, `archived`** — plus `expected_updated` as a guard, not a field.
`id` is the identity; `created`/`updated` are stamped; `members`/`progress`/`total`/
`complete` are derived and stored nowhere.

### F8. FRD-022 conventions this tool must satisfy

- R1 names the inventory by category. `update_group` is a **Write** tool.
- R2 annotations honest: `readOnlyHint: false`, `destructiveHint: false`,
  `idempotentHint: true` — matching `update_item` (`index.ts:667`). Archiving is
  explicitly the *non*-destructive retirement path (FRD-001 G4), and
  `destructiveHint: true` today appears on exactly two tools, `delete_item` and
  `remove_column`. No `confirmDestructive` elicitation.
- R3 descriptions are a contract layer (ADR-0009), so the new description must say
  what is patchable, that `body` replaces rather than merges, that a no-op does not
  bump `updated`, that `kind` cannot change, and that membership rides
  `update_item(groups: [...])`.
- Error shape: every handler is wrapped by `guard()`/`write()`
  (`index.ts:47-74`), which turns a thrown `Error` into
  `{ content: [{type:"text", text:"Error: …"}], isError: true }`. No new error
  plumbing — throw from core and the shape is already right.

### F9. FRD-022 and FRD-001 both need a line; FRD-022 also needs a count fixed

- **FRD-001 G5** (`docs/functional/frd/FRD-001-groups.md:21`) enumerates the group
  surface verbatim and genuinely omits any update — the spec gap the ticket claims.
- **FRD-022 R1** (`FRD-022-mcp-server-surface.md:10`) lists `create_group,
  set_group_doc` under Write; `update_group` belongs there.
- **FRD-022's "Verified against code — Phase 0.2" note** (`:29-30`) says *"24 tools
  registered today, against 29 at the v3 end state (+5 group tools)"*. The end state
  becomes **30 (+6 group tools)**; the surface as registered today is already 29
  (verified: 29 `registerTool(` calls in `index.ts`), so that paragraph is stale in
  its own right.

### F10. The release rail (FRD-022 R6 / FRD-023 R5) — four artifacts move together

- `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` — the Write
  table ends at line 41 (`set_group_doc`); `check-plugin-sync.mjs:39-48` compares
  **registered names vs. first-cell names** and fails on either direction.
- `packages/mcp-server/src/smoke.mjs:46` hard-asserts `tools.tools.length === 29`
  and lines 48-58 assert each group tool exists by name; the group scenario runs at
  `:806-895`.
- `packages/mcp-server/src/smoke-protocol.mjs:158-162` asserts 29 **per protocol
  version** (it loops), so that count moves too.
- `plugins/kanmer/mcp/kanmer-mcp.cjs` is byte-compared against a fresh build
  (`check-plugin-sync.mjs:57-76`) — `npm run plugin:build` and commit the bundle.

`plugin:check` compares **tool names only** (it stops reading at `## Field
semantics`, `check-plugin-sync.mjs:41-45`), so nothing mechanically catches a
description that lies — which is exactly how the two misleading descriptions
survived. FRD-022's own Phase-0.2 note already calls this out at `:37-39`.

### F11. The two descriptions the ticket wants fixed, verbatim

- `list_groups` (`index.ts:442`): *"…archiving is how a group is retired, since
  deleting one would orphan the membership recorded on its tickets."* — true of the
  model, but no tool could do it.
- `set_group_doc` (`index.ts:474`): *"Cannot write the group's own `<ID>.md`; edit
  that through create_group's body."* — impossible advice; `create_group` allocates
  a new id. Should point at `update_group`, matching `groups.ts:173`.

### F12. The in-app manual is NOT affected by editing FRD-001

`scripts/build-manual.mjs:40-47` takes only the **lead prose above the first `## `
heading** from each curated FRD, and the generated groups chapter is just the H1
plus a pointer (`apps/gui/src/renderer/src/manual/chapters.generated.ts:42-43`).
Verified read-only: `node scripts/build-manual.mjs --check` → *"manual: up to date
(12 chapters)"*. Editing G5 changes nothing there, so no `chapters.generated.ts`
churn and no `check:manual` failure.

### F13. AGENTS.md §5's tool list is already stale

`AGENTS.md:335-346` says the server registers **24 tools** and its Write list omits
all five group tools — while telling the reader *"That is the whole surface … so
correct both"*. It is already wrong by five; adding this ticket's line honestly
means fixing the whole list to 30 with the six group tools.

### F14. Two copies of the tool reference are not source

`.claude/skills/kanmer-tickets/references/tool-reference.md` is an untracked local
install (`git ls-files` matches 0 paths under `.claude/skills`) and
`apps/gui/release/win-unpacked/…` is a packaging artifact. Only
`plugins/kanmer/skills/…` is source and only it is read by `check-plugin-sync.mjs:24-27`.

## Implications

1. **The tool is thin, but it is not zero-core.** `store.updateGroup` covers
   title/body/archived and the no-op rule already; `expected_updated` is the one
   genuine core addition, and it drags `conflictError`'s `Item`-typed signature
   with it.
2. **The parameter set is settled by the storage model**, not by taste:
   `id` + `title?` + `body?` + `archived?` + `expected_updated?`. `kind` is
   excluded because the id prefix is allocated from it (F7).
3. **Ordering inside core must mirror `updateItem`**: strip the token, conflict-check,
   *then* no-op-check. Getting it backwards makes a stale token silently succeed
   whenever the patch happens to be a no-op.
4. **Prune undefined and strip `expectedUpdated` before the spread**, or the write
   will either erase `title` or persist a concurrency token into frontmatter (F6).
5. **This is MCP-only.** No IPC, no renderer, no new GUI code (F4).
6. **The doc/rail surface is larger than the code surface**: FRD-001 G5, FRD-022 R1
   + its count note, AGENTS.md §5, the tool reference row, two hard-coded `29`s in
   the smoke scripts, and the regenerated plugin bundle.
7. **`updateGroup` has no unit test at all** — the plan should add core tests
   (no-op, conflict, archive round-trip) alongside the smoke checks, since the
   mcp-server package has no unit tests by design (FRD-022 note, `:48-49`).
