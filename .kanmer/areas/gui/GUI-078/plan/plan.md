# Plan — GUI-078: port the demo harness to the v3 core API

*The plan. Not the checklist — this is the **reasoning**; the checklist is the executable distillation of it.*

Written FROM `research` and `files`.

## Approach

**Fix the seed first, then the payloads.** Six of the twelve errors are
`board.statuses` at six call sites; they are not six problems, they are one
format-2 seed observed six times. Replacing `demoBoard` with a v3 board makes
those call sites either correct or obviously deletable, and it makes the right
answer for everything downstream visible instead of guessed.

The alternative — walk the error list top to bottom, guarding each — was rejected
for the reason the research gives: it would clear the compiler and leave
`getFormat: async () => 2`, `"already format 2"`, `it.status === "planning"` and
`board.statuses.slice(3)` untouched. A demo that compiles and lies is worse than
one that visibly does not build, because only the second one gets fixed.

**Import, don't retype.** `DocModel.profiles` and the doc-type list come from
`@kanmer/core` (already a devDependency), not from a hand-written copy. A copied
table is the exact failure being repaired.

**Delete `getGateStatus`'s fake gates** rather than porting them. Reimplementing
per-profile evaluation inside a fake is a second gate engine to keep in step.

## Governing docs

`docs_todo: true`, correctly: this implements no product behaviour. It brings a
package's demo into line with decisions already made and already governed:

- **ADR-0002** (stages are constants) — the seed's seven `statuses` become the
  six fixed stages from `packages/core/src/stages.ts`.
- **ADR-0006** (priority removed) — `priorities` and `priority` go.
- **FRD-002** (profiles) and **FRD-003** (folder-per-doc-type) — `DocModel.profiles`,
  `TicketDocsInfo.counts` / `.references` are these two arriving in the fake.

Nothing is met, modified or created here; the work is *conformance* to documents
that already hold. Recorded rather than left blank so review can check the claim.

## Steps

1. **`demoBoard`** — drop `statuses` and `priorities`; keep `areas`,
   `idPrefixes`, `deployment`. Add `profiles: DEFAULT_PROFILES` and
   `defaultProfile` so the demo board is a real v3 board.
2. **`demoItems`** — drop `priority`; remap any `researching` / `planning`
   status to `preparing`; give each item a `profile`.
3. **`DEMO_DOC_TYPES`** — `impact` → `files`, and drop the `requires` /
   `progress` metadata if the v3 type is a plain id list.
4. **The six `board.statuses` sites** — replace with `STAGES` from
   `@kanmer/core`: `lastStage()`, the `createItem` default status, `takeTicket`'s
   implementing lookup, and the two in `getGateStatus`.
5. **`addColumn`** — `kind` is `"area"` only; delete the `statuses` / `priorities`
   branches rather than leaving unreachable code.
6. **`migrate`** — return `{ v2, backfill, v3 }`, with `v3.alreadyV3: true` and an
   honest note.
7. **`getFormat`** — `3`.
8. **`getDocsInfo`** — add `counts` (derive from the demo's own doc map, so the
   numbers are real) and `references` (a small plausible list).
9. **`getDocModel`** — return the `DocModel` shape: `docTypes`,
   `gateExemptFolders`, `boundaries`, `profiles`, `defaultProfile`, `proofTypes`,
   imported from core.
10. **`getGateStatus`** — return an empty map with a comment saying the demo does
    not evaluate gates and why.
11. Sweep the file for surviving v2 vocabulary the compiler cannot see.

## Verification

- `npx tsc --noEmit -p packages/ui/tsconfig.json` — **zero** errors, run at the
  repo root where `node_modules` exists.
- `grep -nE "statuses|priorit|planning|researching|impact" packages/ui/src/` —
  every remaining hit justified in the report or it is a miss.
- `grep -nE "\bas any\b|as unknown as" packages/ui/src/demo.tsx` — zero. The
  ticket's second box; a cast here ships wrong types to a design-system consumer.
- `npm run build:ui` — `dist/index.js`, `index.d.ts`, `index.css` all produced.
- `index.d.ts` contains the new payload shapes, not the old ones — the emitted
  types are what a consumer actually gets, so read them rather than assume.
- The rest of the rail unchanged: `npm test`, `plugin:check`, `smoke:protocol`,
  `verify:agents-block`.
- Then `npm run typecheck -w @kanmer/ui` clean, which is what unblocks
  [[GUI-067]].

## Risks / open questions

- **This tsconfig also compiles `apps/gui/src/renderer`.** New errors from there
  belong to the GUI workspace, not this ticket — check the path before absorbing
  anything.
- **"The demo renders" is hard to evidence.** There is no test harness and no
  story runner in `packages/ui`. The honest fallback is that the build emits and
  the types are right, and to say in `proof` that a render was **not** observed
  rather than implying it was. Do not claim it.
- **Importing `DEFAULT_PROFILES` couples the demo to core's defaults**, so the
  demo shifts when they do. Deliberate — argued in `open-questions`.
- All three open questions are resolved; one item parked (no tests in
  `packages/ui`). Nothing awaits the operator.
