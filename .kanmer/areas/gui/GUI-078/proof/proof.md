# Proof — GUI-078

PR [#35](https://github.com/collisionengineers/kanmer/pull/35), merged as
**`c6a48b2`**. Commit `dfa2133`. Run on merged `main`, at the repo root.

## The unblocking check

```
$ npm run typecheck -w @kanmer/ui
> tsc --noEmit
exit=0
```

Clean, from 12 errors. That is what [[GUI-067]] was blocked on.

And every workspace, since that is GUI-067's actual claim and it is worth
knowing now rather than discovering there:

```
@kanmer/core         clean
@kanmer/mcp-server   clean
@kanmer/ui           clean
@kanmer/gui          clean
```

## The build still emits

```
$ npm run build:ui
ESM  dist/index.css   30.28 KB
ESM  dist/index.js   233.40 KB
DTS  dist/index.d.ts  24.72 KB
```

All three artifacts. The emitted `index.d.ts` declares `demoBoard`, `demoItems`,
`demoGroups` and `demoActivity`, and contains no format-2 vocabulary except one
comment explaining its absence.

## Rail, on merged `main` (`c6a48b2`)

```
npm test                     core 182 passed · gui 202 passed
npm run plugin:check         29 tools match, bundle bytes match
npm run smoke:protocol       26/26
npm run verify:agents-block  26/26
```

Unchanged from `fc52cba`, which is the expected result: nothing outside
`packages/ui` was touched, and `packages/ui` has no tests.

## The finding worth keeping

**Twelve type errors were hiding a thirteenth problem twice their size.** After
the shape fixes, the compiler reported:

```
demo.tsx(317,9): error TS2740: ... is missing the following properties from
type 'ProjectClient': dispatchOptions, getGates, listGroups, getGroup, and 8 more.
```

TypeScript reports property-level mismatches inside an object literal **before**
it reports the literal being structurally incomplete. So the demo's total absence
of groups, references, `getGates` and `dispatchOptions` — the entire v3 surface —
was invisible behind errors about `board.statuses`.

The general lesson, which is why this is in proof rather than a note: an error
count is not a size estimate. This ticket was scoped as "12 errors, mechanical",
filed on that basis, and the real work was roughly double.

## What this run does NOT prove

- **The demo has not been observed to render.** `packages/ui` has no test harness
  and no story runner, so there is nothing to run it in. The ticket's last
  verification box asked for exactly this and it is **unmet**, not reinterpreted.
  What is proven is that it compiles, that the emitted types are right, and that
  every payload shape was read from `types.ts` / `ipc.ts` rather than guessed.
- **`getDocsInfo.counts` is 1-or-0 per type**, not a real recursive count. The
  demo stores one string per doc type, so there is nothing multi-file to count. A
  consumer exercising format 3's several-files-per-type model learns nothing from
  the demo. Stated rather than papered over with a fabricated number.
- **The mirrored constants will drift, and the date is known.** The plan and
  `open-questions` both argued for importing them from `@kanmer/core`; the build
  disproved that — core declares one export whose barrel reaches `node:fs`,
  `node:path` and `node:crypto`, and this package builds `platform: "browser"`.
  Types erase, values do not. [[CORE-027]] is the real fix, and it names
  [[SKILL-013]] as the change that will desynchronise the copy.
- **The review was not independent.** Author and reviewer were the same agent,
  stated at the top of `scratch/review.md`.

---

**Merged:** PR [#35](https://github.com/collisionengineers/kanmer/pull/35) —
merge commit `c6a48b2`. Conformance to ADR-0002, ADR-0006, FRD-001, FRD-002 and
FRD-003; none modified. Unblocks [[GUI-067]]. Follow-up [[CORE-027]] filed.
