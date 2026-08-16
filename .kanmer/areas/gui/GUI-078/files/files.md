# Files — GUI-078

*The files document. Not the research — this is the **surface area** of the change, not the findings behind it.*

## Where the change lands

| Path | Why |
|---|---|
| `packages/ui/src/demo.tsx` | the whole ticket. Seed data (`demoBoard`, `demoItems`, `DEMO_DOC_TYPES`), the three reshaped payloads (`migrate`, `getDocsInfo`, `getDocModel`), `addColumn`'s dead branch, `getFormat`, and `getGateStatus`'s hardcoded gate strings. |
| `packages/ui/src/index.ts` | only if a re-export changes name. `demoBoard`, `demoItems`, `demoActivity`, `KanmerProviderProps` are the public surface (`:75-79`) and should keep their names — a rename here is a breaking change to the design system for no gain. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `packages/core/src/types.ts:58-70` | `TicketDocsInfo` — `counts` is documents **per type folder**, counted recursively, and `references` is human-supplied inputs (name + absolute path). The demo must produce plausible values, not empty objects, or it demonstrates nothing. |
| `apps/gui/src/shared/ipc.ts:25-29` | `BoardMigrationReport` is three nested reports (`v2`, `backfill`, `v3`), not one flat one. |
| `apps/gui/src/shared/ipc.ts:259-272` | `DocModel` — `profiles` is profile → boundary → requirements. This is the shape to mirror from `DEFAULT_PROFILES`. |
| `packages/core/src/profiles.ts` | the authoritative doc-type list and the four shipped profiles. `files`, not `impact`; and the profile map the demo should show. |
| `packages/core/src/stages.ts` | the six fixed stages and their order. The seed's seven-stage list is replaced from here, not retyped. |
| `packages/core/src/types.ts:224-245` | why `statuses` is still `.optional()` — a v1/v2 file must still parse. Do not "fix" the schema; fix the seed. |
| `packages/ui/tsconfig.json` | includes `../../apps/gui/src/renderer/src/**/*`, so this typecheck also compiles the GUI renderer. If errors appear from `apps/gui`, they belong to the GUI workspace, not here — check before absorbing them. |

## Ripple effects

- **`npm run build:ui`** runs tsup with `dts: true`, so the emitted `index.d.ts`
  changes with the payload shapes. It must still produce `dist/index.js`,
  `index.d.ts` and `index.css`.
- **[[GUI-067]]** is blocked on this and unblocks the moment
  `npm run typecheck -w @kanmer/ui` is clean. That is the ticket's real success
  condition.
- **No tests exist for `packages/ui`** — no `*.test.ts` anywhere in it. So the
  compiler and a render check are the only evidence available, which is why the
  ticket asks for the demo to *run* rather than only compile.
- Nothing else imports `@kanmer/ui`; `apps/gui` owns the components and this
  package re-exports them, not the reverse.

## Out of scope

- **The `apps/gui` renderer**, even though this tsconfig compiles it. It is
  clean today and belongs to the GUI workspace.
- **Adding tests to `packages/ui`.** Worth doing, not here — this ticket is
  getting an existing file to tell the truth, and a test harness for a design
  system is its own piece of work.
- **`@kanmer/ui`'s absence from the rail.** That is precisely [[GUI-067]], which
  this ticket unblocks rather than duplicates.
- **Redesigning the demo data.** The seed's *content* — three areas, a spread of
  tickets, realistic activity — is good and stays. Only its format-2 vocabulary
  changes.
