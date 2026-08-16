# Research — GUI-078: what `@kanmer/ui`'s demo is actually stuck on

*The research. Not the files document — this is what I **learned**, not what I will **touch**.*

## Question

Are `demo.tsx`'s twelve type errors a set of independent slips, or one thing?

## Findings

**One thing.** `demo.tsx` implements the `ProjectClient` interface as an
in-memory fake, and it was written against **format 2**. Every error is that fake
returning a v2 shape where the interface now says v3. The interface moved; the
fake did not.

### The seed data is the root, not the call sites

`demoBoard` (`demo.tsx:34-57`) is a format-2 board:

```ts
statuses: [ backlog, researching, planning, implementing, review, verifying, done ],   // 7 stages
priorities: [ low, medium, high, urgent ],
```

Format 3 removed both: stages are constants (ADR-0002, six of them) and priority
is gone (ADR-0006). `BoardConfigSchema` keeps `statuses` as `.optional()`
(`types.ts:245`) purely so a v1/v2 file still parses — which is exactly why the
compiler says *possibly undefined* rather than *does not exist*, and why six of
the twelve errors are the same `board.statuses` complaint at different call
sites. Fix the seed and those six stop being reachable questions.

`DEMO_DOC_TYPES` (`:252-260`) lists **`impact`** — the type format 3 renamed to
`files`, and the one [[SKILL-014]] swept out of the skill tree this morning. The
same stale vocabulary in a second place, found the same day, which is worth
noting rather than quietly correcting: it is evidence for the parked question on
SKILL-014 about nothing in the rail asserting the doc-type vocabulary.

### Three payloads changed shape entirely

| Method | Returns now | `demo.tsx` returns |
|---|---|---|
| `migrate` | `{ v2, backfill, v3 }` (`ipc.ts:25-29`) | the flat v2 `MigrationReport` |
| `getDocsInfo` | `TicketDocsInfo` — `docs`, `checklist`, **`counts`**, **`references`** (`types.ts:58-70`) | `{ docs, checklist }` |
| `getDocModel` | `DocModel` — `repoDocs`, **`docTypes`**, **`gateExemptFolders`**, **`boundaries`**, **`profiles`**, `defaultProfile`, `proofTypes` (`ipc.ts:259-272`) | `{ repoDocs, defaultTypes, defaultGates }` |

`counts` (documents per type folder) and `references` are the folder-per-doc-type
model; `defaultGates` → `profiles` is the whole profile system. These are not
renames, they are the v3 features arriving.

### One error is a genuine dead branch

`addColumn` (`:478-481`):

```ts
const key = kind === "status" ? "statuses" : kind === "area" ? "areas" : "priorities";
```

`kind` is now typed `"area"` alone — areas are the only configurable column — so
`kind === "status"` is unreachable and TS says the comparison has no overlap.
That is `TS2367` at `:429`, and the `[Symbol.iterator]` error at `:430` follows
from indexing the board with a key that might be `statuses` (optional) or
`priorities` (gone).

### What the compiler cannot see

```ts
getFormat: async () => 2,
notes: ["Board is already format 2 — nothing to do."],
if (it && !(docs[id]?.plan) && it.status === "planning")
  out[s.id] = ["plan.md required before leaving Planning"]
board.statuses.slice(3)
```

All type-clean once the shapes are fixed, all wrong. `getFormat` returning `2`
would make a consumer's migration banner appear permanently. `slice(3)` is a
magic index into a seven-element list, meaningless against six fixed stages.

**This is the finding that decides the approach**: making the twelve errors go
away is roughly a third of the work, and the cheap version of it — a guard here,
a cast there — leaves a demo that compiles and lies. The ticket said so; the code
confirms it.

## Implications

- Fix the **seed** (`demoBoard`, `DEMO_DOC_TYPES`, `demoItems`) first. Six of
  twelve errors are downstream of `statuses` alone, and a demo seeded with v3
  data is the only version where the remaining fixes have an obvious right
  answer.
- The three reshaped payloads need real values, not stubs. `DocModel.profiles`
  in particular should mirror `DEFAULT_PROFILES` so the design system demonstrates
  the gate behaviour it actually has.
- `getGateStatus`'s fake gate logic should be **deleted rather than ported**. It
  hardcodes a rule (`plan.md required before leaving Planning`) that the real
  engine derives per profile — FRD-023 R1's "derive, don't restate" applied to a
  demo. Reproducing profile evaluation in a fake is a maintenance trap.
- Nothing outside `packages/ui/src` depends on this. `demo.tsx` is exported from
  `index.ts` but no other workspace imports `@kanmer/ui` — it exists for Claude
  Design, so the blast radius is the design system alone.

## Open questions

Recorded in `open-questions`. None needs the operator.
