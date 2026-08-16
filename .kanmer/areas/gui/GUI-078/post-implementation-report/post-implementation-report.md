# Post-implementation report — GUI-078

Branch `gui-078-ui-demo-v3`. Two files, +276 −65, both in `packages/ui/src`.

## What changed

### The seed data

`demoBoard` loses `statuses` (ADR-0002) and `priorities` (ADR-0006) and gains
`profiles` + `defaultProfile`. `demoItems` lose their `priority` field, the two
tickets sitting in `researching` / `planning` move to `preparing`, and four gain
`groups` membership. `DEMO_DOC_TYPES` renames `impact` → `files`, and the
`API-009` demo document keyed `impact` is rewritten as a real `files` document
with a path table — a key that no longer matched any doc type.

### The three reshaped payloads

- `migrate` → `{ v2, backfill, v3 }` with `v3.alreadyV3: true`.
- `getDocsInfo` → gains `counts`, **derived from the demo's own doc map** rather
  than stubbed, and `references`.
- `getDocModel` → the real `DocModel`: `docTypes`, `gateExemptFolders`,
  `boundaries`, `profiles`, `defaultProfile`, `proofTypes`.
- `getFormat` → `3`, not `2`. The compiler never objected to `2`; it would have
  shown a consumer a permanent migration banner.

### Twelve methods the demo never had

The headline finding. TypeScript reports property-level mismatches inside an
object literal *before* it reports the literal being structurally incomplete, so
`ProjectClient`'s missing members were invisible behind the twelve errors:

```
missing: dispatchOptions, getGates, listGroups, getGroup, createGroup,
         updateGroup, getGroupDoc, setGroupDoc, pickReferences,
         addReference, openReference, removeReference
```

Groups, references and gates — the whole v3 surface. Implemented as working
in-memory fakes, not throwing stubs. Two demo groups (`EPIC-001`, `HZN-001`) with
membership stored **on the tickets** and derived on read, because that is the
real model and a demo that inverts it teaches the wrong thing.

`getGates` returns `null` and `getGateStatus` an empty map, deliberately: the
demo evaluates no gates. The previous version *did* guess — hardcoding
`"plan.md required before leaving Planning"` against a stage format 3 does not
have, and indexing `board.statuses.slice(3)`.

### `addColumn`

`kind` is `"area"` alone in format 3, so the `statuses` / `priorities` branches
were unreachable. Deleted rather than left as dead code.

## The plan changed under me, and the build is what said so

`open-questions` answer 2 — import `DEFAULT_PROFILES` and the stage list from
`@kanmer/core` rather than retyping, since "a hand-copied profile table is the
same class of bug this whole ticket is fixing" — **is wrong**, and I shipped the
opposite.

It typechecked. Then `tsup` failed:

```
✘ [ERROR] Could not resolve "fs"
✘ [ERROR] Could not resolve "path"
✘ [ERROR] Could not resolve "crypto"
```

Core declares one export (`"."`) and `src/index.ts` re-exports `store`, `io`,
`migrate` and `groups`, which import Node built-ins. `@kanmer/ui` builds with
`platform: "browser"`. Types are erased at compile time; values are not — which
is precisely why the original author's imports were type-only, a constraint
written down nowhere.

So the constants are mirrored, in **one block** at the top of `demo.tsx`, each
naming its source file, with a comment stating plainly that they are copies and
will drift. `deriveMembers` is inlined with its archived-members rule copied
faithfully. That is a mitigation, not a fix.

[[CORE-027]] filed for the real fix — a browser-safe subpath export plus a rail
check that the emitted browser entry references no `node:` specifier. It notes
that [[SKILL-013]] is about to add `enter-review` to `fix`, so this copy has a
known expiry date rather than an open-ended one.

## Governing docs

`docs_todo: true`. Nothing is met, modified or created — this is *conformance* to
decisions already governed: **ADR-0002** (stages are constants), **ADR-0006**
(priority removed), **FRD-002** (profiles), **FRD-003** (folder-per-doc-type),
**FRD-001** (groups; membership on the ticket, derived on read).

## Verification

Run from the repo root — a worktree has no `node_modules`, and running the
compiler where the dependencies are is the point of AGENTS.md gotcha 8.

```
$ npx tsc --noEmit -p packages/ui/tsconfig.json     (no output — clean)
$ npx tsup                                          ESM  dist/index.css  30.28 KB
                                                    ESM  dist/index.js  233.41 KB
                                                    DTS  dist/index.d.ts 24.72 KB
$ grep -E "\bas any\b|as unknown as" src/demo.tsx   only the pre-existing window bridge
$ grep -E "statuses|priorit|planning|impact" src/   3 explanatory comments +
                                                    prioritiesStripped (a V3Report field)
```

The emitted `index.d.ts` declares `demoGroups` and carries no v2 vocabulary
beyond one comment explaining the absence. `dist/` was removed after checking —
gitignored, not part of the change.

**Baseline confirmed before starting**: `npx tsup` on unmodified `main` reports 0
errors, so the build failure above was caused by my import change and not
inherited.

## What `kanmer-verify` should run on merged `main`

- `npm run typecheck -w @kanmer/ui` — clean. This is what unblocks [[GUI-067]].
- `npm run build:ui` — all three artifacts.
- The rest of the rail: `npm test`, `plugin:check`, `smoke:protocol`,
  `verify:agents-block`. None should move; nothing outside `packages/ui` changed.

## Risks and follow-ups

- **"The demo renders" is not evidenced and I am not claiming it.** `packages/ui`
  has no tests and no story runner. The build emits and the types are right; a
  render was **not** observed. The ticket asked for it and it is the one box that
  cannot be honestly ticked without a harness, which is itself parked.
- **The mirrored constants will drift**, by design of the workaround. [[CORE-027]].
- **`getDocsInfo.counts` reports 1-or-0 per type**, not a true recursive count —
  the demo stores one string per doc type, so a real count has nothing to count.
  Honest for the data shape; a consumer testing multi-file types gets nothing
  useful from the demo.
