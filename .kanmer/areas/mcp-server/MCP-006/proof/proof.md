# Proof — MCP-006: `update_group` on the MCP surface

*The proof. Not the report — this is **evidence** gathered after merge; the report was the claim before it.*

Verified on **merged `main`**, from the **main checkout** (`C:\Users\PC\Documents\GitHub\kanmer`),
at `ac01b8b` — "Add update_group to the MCP surface (MCP-006) (#58)". Working
tree clean apart from two untracked images unrelated to this ticket.

Three other PRs landed between the branch point (`d1ef063`) and the merge —
SKILL-013 (#56, which also edits AGENTS.md and added two new prose/consistency
gates), and the ADR renumbering PRs #57 and #59. The squash merge applied
cleanly over all three, and the gates #56 introduced were run here as well, since
this PR touched a file it also touched.

## Evidence

### 1. `plugin:check` — the one gate the PR could not run

This is the check that refused inside the ticket worktree by design (MCP-007,
path-based, no bypass). It is meaningful only where the artifact was built, so it
was deferred to here.

```
$ npm run build && npm run plugin:check
> node scripts/check-plugin-sync.mjs

plugin-sync OK — 30 tools match, bundle bytes match, 12 skill frontmatters parse, manifests at v0.3.2
```

Both halves pass. **30 tools match** — the registered names and the tool
reference's first-cell names agree in both directions, so `update_group` is
neither undocumented nor documented-but-unregistered. **Bundle bytes match** —
the committed `plugins/kanmer/mcp/kanmer-mcp.cjs`, built in the worktree, is
byte-identical to a fresh build from the main checkout. The risk the report
flagged (a bundle built somewhere else disagreeing) did not materialise.

### 2. The tool count, from three independent directions

```
$ grep -c 'registerTool(' packages/mcp-server/src/index.ts
30
```

```
$ npm run smoke:protocol
PASS  tools/list returns 30 tools on 2025-11-25  — got 30
PASS  tools/list returns 30 tools on 2025-06-18  — got 30
PASS  tools/list returns 30 tools on 2025-03-26  — got 30
PASS  tools/list returns 30 tools on 2024-11-05  — got 30
26/26 checks passed
```

Source count, reference-table count (via `plugin:check`) and the count observed
over the wire on **all four** supported protocol revisions all say 30. The
docs were reconciled against that number, not against research's figures.

### 3. The ticket's acceptance list, over real stdio against the committed bundle

```
$ KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs node packages/mcp-server/src/smoke.mjs

PASS  update_group tool exists
PASS  update_group renames a group  — Checkout rework v2
PASS  the rename is visible through get_group
PASS  and its derived members survive the rename
PASS  kind is not patchable — the id prefix encodes it
PASS  a no-op patch does not bump updated
PASS  a stale expected_updated is a conflict
PASS  a fresh expected_updated is accepted
PASS  the concurrency token is never written into the group's frontmatter
PASS  archiving drops the group from list_groups
PASS  but include_archived still returns it
PASS  member tickets are untouched by archiving the group (FRD-001 G4)
PASS  unarchiving restores it — archiving is reversible
PASS  update_group refuses an unknown id

156/156 checks passed
```

Mapped onto the ticket's own Verification list:

- **"An agent can rename a group and the change is visible in `get_group`"** —
  lines 2–3, plus line 4 confirming the derived membership is untouched by it.
- **"An agent can archive a group; it drops out of `list_groups` unless
  `include_archived`, and member tickets are untouched (FRD-001 G4)"** — lines
  10–12, with line 13 proving the reverse direction, which is what makes
  `destructiveHint: false` honest.
- **"A no-op patch does not bump `updated`"** — line 6.
- **"`list_groups` and `set_group_doc` descriptions no longer describe operations
  that cannot be performed"** — prose, not machine-checkable (see Limits);
  verified by reading the merged file.
- **"Tool reference and FRD-001 G5 updated; `plugin:build` + `plugin:check` pass
  with the regenerated bundle committed"** — §1 above.

Note this ran against `plugins/kanmer/mcp/kanmer-mcp.cjs` — the committed
bundle, i.e. the exact binary an installed plugin executes — not against
`dist/index.js`.

### 4. Tests and types on merged main

```
$ npm test
manual: up to date (19 chapters)
@kanmer/core   Test Files  11 passed (11)    Tests  249 passed (249)
@kanmer/gui    Test Files  23 passed (23)
scripts        tests 46   pass 46   fail 0
```

```
$ npm run typecheck
@kanmer/core        tsc --noEmit   (clean)
@kanmer/mcp-server  tsc --noEmit   (clean)
@kanmer/ui          tsc --noEmit   (clean)
@kanmer/gui         tsc --noEmit -p tsconfig.node.json && -p tsconfig.web.json   (clean)
```

Two things worth naming rather than leaving implicit:

- **`check:manual` is "up to date"**, so editing FRD-001 G5 did not move
  `chapters.generated.ts` — the prediction in `files` (the generated chapter takes
  only prose above the first `## `, and G5 sits under `## Tools`) held.
- **The GUI typechecks untouched.** This is the load-bearing evidence for the
  "MCP-only" claim: `updateGroup`'s new field is optional, so
  `apps/gui/src/main/index.ts`'s call site and the `shared/ipc.ts` patch type stay
  assignable with no GUI change at all.
- **`kanmerGit.test.ts` did not flake** (GUI-085); no rerun was needed.

### 5. The gates SKILL-013 (#56) added, since this PR also touched AGENTS.md

```
$ npm run verify:agents-block
PASS  this repo's AGENTS.md carries the current body
PASS  the GUI imports the canonical body instead of declaring one
28/28 checks passed

$ node scripts/check-doc-numbering.mjs
doc-numbering OK — ADR, FRD, PRD each have exactly one file per number

$ node scripts/verify-skill-prose.mjs
ALL CHECKS PASSED
```

The §5 edit landed in the hand-maintained part of AGENTS.md and left the
kanmer-setup managed block intact, which is what `verify:agents-block` asserts.

### 6. The merged prose reads correctly

`AGENTS.md` on merged main, confirming the edit survived the squash over #56's
own AGENTS.md changes:

```
$ grep -n 'registers \*\*30 tools\*\*\|update_group' AGENTS.md
338: … registers **30 tools**, plus MCP resources …
355: - Write — 16: … `create_group`, `update_group`, `set_group_doc`
358: `update_group` patches a group's `title`/`body`/`archived` only: `kind` is
     unpatchable because `createGroup` allocates the id from its prefix …
```

Both descriptions the ticket set out to fix now name a tool that exists:
`list_groups` points at `update_group(archived: true)`, and `set_group_doc` says
"edit that with update_group instead" — which finally makes the error core has
always thrown at `groups.ts:173` refer to something real.

## Limits of this proof

- **The live-MCP check could not run in this session.** This session's Kanmer
  server was spawned before the merge, so it still exposes the 29-tool surface and
  `update_group` is not callable from here; it needs a host restart. That is
  expected rather than a failure — and it is precisely the situation MCP-012's
  `get_status.server` block exists to make visible. The nearest equivalent
  evidence is §3, which drives the committed bundle over real stdio, i.e. the same
  binary a restarted host would load.
- **Nothing mechanically verifies tool *descriptions*.** `plugin:check` compares
  names only, stopping at `## Field semantics`. Two of the ticket's five
  acceptance items are prose, and their evidence is a human reading the merged
  file (§6), not a green check. This is the gap that let the two misleading
  descriptions survive in the first place; it is parked as its own ticket in
  `open-questions`, and FRD-022's Phase-0.2 note flags it independently.
- **`FRD-022`'s R2 Phase-0.2 bullet still carries stale line references**
  (`index.ts:744`/`:800`; actually `:976`/`:1025`). Its *claim* — `destructiveHint:
  true` on exactly two tools — is still true and is confirmed by this change
  leaving both alone. Raised as non-blocking in review and deliberately left out
  of scope; worth a sweep of that whole audit note.
