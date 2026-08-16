# Open questions — MCP-006

*The open questions. Not scratch — these **block** the ticket at three real gates; scratch is a notepad and is never gated.*

Nothing here blocks planning. Every question below was settled by the code or by
an explicit default; the two marked **OPERATOR** are judgement calls where a
default was taken and recorded, and where the operator can overrule cheaply
before implementation starts.

## Settled by the code

- [x] **Is `kind` legitimately patchable?** — **No.** `createGroup`
      (`store.ts:1250-1275`) allocates the id from the kind's prefix, so `EPIC-`/
      `HZN-` permanently encodes the kind; patching it would leave `HZN-003`
      claiming `kind: epic` and `list_groups(kind:)` disagreeing with every id on
      the board. Excluded, and the description should say so explicitly, exactly
      as `update_item` does for `type` (`index.ts:625`).
- [x] **Then what is the parameter set?** — `id` (required), `title?`, `body?`,
      `archived?`, `expected_updated?`. That is precisely what
      `store.updateGroup` already accepts, plus the concurrency guard.
      `id`/`created`/`updated` are identity or stamped; `members`/`progress`/
      `total`/`complete` are derived and stored nowhere (FRD-001 G3).
- [x] **Does `expected_updated` need a core change, given the ticket says "no new
      core logic"?** — Yes, a small one, and the ticket already anticipates it
      ("Consider `expected_updated`"). `store.updateGroup` has no
      `expectedUpdated`, and `conflictError` is typed to `Item` so it must be
      widened structurally. The conflict *wording* is contract and stays byte-identical.
- [x] **Does the GUI need an IPC path?** — **No.** `kanmer:updateGroup` already
      exists across channel, main handler, preload, renderer client, and the
      read-only guard list, and `GroupView` already calls it to archive
      (research F4). Adding an optional field to core's patch type keeps the GUI
      call sites assignable, so the GUI compiles untouched.
- [x] **Should `update_group` carry `destructiveHint` or elicit confirmation for
      `archived: true`?** — **No.** FRD-001 G4 makes archiving the explicitly
      non-destructive retirement path, it is reversible, and `update_item`
      archives without either. Annotations: `readOnlyHint:false`,
      `destructiveHint:false`, `idempotentHint:true`.
- [x] **Does amending FRD-001 force a manual rebuild?** — **No.**
      `build-manual.mjs` takes only prose above the first `## ` heading; the
      generated groups chapter is an H1 plus a pointer, and
      `node scripts/build-manual.mjs --check` reports up to date. G5 lives below
      `## Tools`, so `chapters.generated.ts` does not move.

## Judgement calls — default taken, operator may overrule

- [x] **OPERATOR — how far should the AGENTS.md §5 fix go?** `AGENTS.md:335-346`
      says the server registers "24 tools" and its Write list omits **all five**
      existing group tools, while instructing the reader "correct both". Default
      taken: **fix the list properly** — count to 30 and add all six group tools —
      because adding only `update_group` to a list that is already wrong by five
      leaves it wrong by five. Overrule if you would rather this ticket touched
      only its own line and a separate chore fixed the rest.
- [x] **OPERATOR — should the FRD-022 Phase-0.2 "verified against code" note be
      corrected too?** It reads "24 tools registered today, against 29 at the v3
      end state (+5 group tools)" (`FRD-022:29-30`); today's real count is 29 and
      the end state becomes 30 (+6). Default taken: **correct it in this ticket**,
      since it is the same paragraph a reader consults to know the surface's size.
      Overrule if audit notes are meant to be historical snapshots left as written.

## Parked (explicitly deferred)

- [ ] **Should the GUI let a human edit a group's title and body?** `GroupView`
      renders both read-only (`GroupView.tsx:87-90`) and only exposes the
      Archive/Unarchive toggle, so after this ticket an *agent* can rename a group
      but a *human* still cannot. Safe to defer: this ticket is MCP-only by scope
      and the IPC path it would need already exists. Reopen — as a GUI ticket — if
      renaming a group from the board becomes a real need.
- [ ] **Should `plugin:check` verify tool *descriptions*, not just names?**
      Description drift is unguarded (`check-plugin-sync.mjs:41-45` stops at
      `## Field semantics`), which is exactly how the two misleading group
      descriptions this ticket fixes survived; FRD-022's own note flags it at
      `:37-39`. Safe to defer: it is a tooling change with its own design
      questions and would balloon this ticket. Reopen as its own ticket.
- [ ] **Should `updateGroup` log per-field activity entries like `updateItem`?**
      Today it appends one `update` entry with `field: "group"` regardless of what
      changed (`store.ts:1299`). Safe to defer: it is existing behaviour, not a
      regression this ticket introduces, and nothing consumes group activity
      per-field yet. Reopen if the GUI ever shows a group history.
