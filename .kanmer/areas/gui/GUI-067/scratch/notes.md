**2026-08-16 — paused before implementation; now blocked by [[GUI-078]].**

The plan assumed `@kanmer/ui` had **one** type error (`board.statuses` possibly
undefined at `demo.tsx:523`), fixable inline as step 2. Running the full
typechecker rather than reading npm's truncated tail:

```
$ npx tsc --noEmit -p packages/ui/tsconfig.json
demo.tsx(318,27) (318,42) (347,33) (414,36) (521,23) (523,25)  'board.statuses' is possibly 'undefined'
demo.tsx(349,25)  Property 'priority' does not exist on type 'CreateItemInput'
demo.tsx(429,19)  '"area"' and '"status"' have no overlap
demo.tsx(430,38)  ... must have a '[Symbol.iterator]()' method
demo.tsx(463,32)  BoardMigrationReport is missing v2, backfill, v3
demo.tsx(492,5)   TicketDocsInfo is missing counts, references
demo.tsx(507,30)  DocModel is missing docTypes, gateExemptFolders, boundaries, profiles, and 2 more
```

**Twelve errors, and the whole demo harness is written against the v2 core API.**
Not a guard — a rewrite against `types.ts`.

The escape that would have made this a one-liner does not exist: `demo.tsx` is
**exported from `index.ts:75-79`** (`demoBoard`, `demoItems`, `demoActivity`,
`KanmerProviderProps`), so it is part of the package's public surface and cannot
be dropped from the tsconfig as dev-only scaffolding.

So the choice was: rewrite a design-system demo inside a chore called "make the
typecheck cover every workspace", or file it. Filed as [[GUI-078]], which now
`blocks` this ticket — the same scope-smuggling this ticket's own plan warned
against two paragraphs earlier.

**The plan's steps 1 and 3–7 are unchanged and still correct.** Step 2 ("guard
`board.statuses`") is withdrawn and replaced by "GUI-078 lands first". Released
and returned to Preparing; the worktree and branch were removed unused, since
nothing was written.
