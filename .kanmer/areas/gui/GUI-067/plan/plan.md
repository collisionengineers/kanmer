# Plan — GUI-067: make the root typecheck cover every workspace

*The plan. Not the checklist — this is the **reasoning**; the checklist is the executable distillation of it.*

## The ticket's premise is wrong in a way that makes it worse

It says "`npm run typecheck` at the repo root does not reach the `@kanmer/gui`
workspace". Measured: **there is no root `typecheck` script at all.**

```
$ node -p "require('./package.json').scripts.typecheck"
undefined
```

So AGENTS.md §10's checklist names `npm run typecheck -w @kanmer/gui` — a
*per-workspace* command — and a reader who runs the repo-root command the ticket
imagines gets `npm error Missing script`. There is nothing to extend; there is
something to create.

The ticket's second claim is already satisfied and should not be "fixed":
`apps/gui/tsconfig.web.json` includes `src/renderer/**/*`, which covers
`*.test.ts`. That is why `npm run typecheck -w @kanmer/gui` caught the `c8b94a4`
error when `release.mjs` eventually ran it. The GUI's own config was never the
gap — the missing aggregate was.

## `@kanmer/ui` does not typecheck today

The reason this ticket is not a one-line `package.json` edit:

```
$ npm run typecheck -w @kanmer/ui
src/demo.tsx(523,25): error TS18048: 'board.statuses' is possibly 'undefined'.
```

`@kanmer/ui` is a tracked workspace (`0.2.0`, the design system packaged for
Claude Design) with a `typecheck` script that **nothing has ever run**. `build:ui`
exists; no rail calls its typecheck. So the very first honest aggregate turns the
rail red — which is the ticket working, not the ticket failing.

Worse, `demo.tsx` is **format-2 era**: `board.statuses`, `it.status === "planning"`,
`"plan.md required before leaving Planning"`. Format 3 has six fixed stages and
no `planning`. That is real debt, and it is not this chore's job.

## Approach

Add a root `typecheck` that runs **every** workspace, and make it fail on
`@kanmer/ui` today by fixing the one type error — not by excluding the workspace.
Excluding it would reproduce the exact failure this ticket exists to stop: a
green rail that quietly does not cover something.

`--workspaces --if-present` over a hand-listed sequence, so a workspace added
later is covered without anyone remembering. `packages/*` and `apps/*` are the
declared workspaces; all four define `typecheck`, so `--if-present` costs nothing
today and stops a future workspace without one from breaking the rail.

`demo.tsx:523` gets a guard, nothing more. The surrounding v2-era stage
vocabulary is **filed as its own ticket**, because rewriting a demo's data model
inside a chore called "make the typecheck cover every workspace" is exactly the
scope-smuggling `kanmer-review` is supposed to catch.

Rejected: adding `@kanmer/ui` behind a `|| true`, or listing three workspaces and
omitting the fourth. Both produce a command whose name overstates what it does,
which is the defect.

## Governing docs

`docs_todo: true` — this chore has no governing FRD, correctly. It changes a
build script and a line of AGENTS.md; it implements no product behaviour. The
rule it serves is **AGENTS.md §10** itself, which is contributor documentation
rather than a governing document.

Recorded rather than left blank: FRD-023 R5 mentions the release rail, but that
is about the *plugin* rail specifically and this is broader. No PRD/FRD/ADR is
met, modified, or created.

## Steps

1. Add `"typecheck": "npm run typecheck --workspaces --if-present"` to the root
   `package.json`.
2. Fix `packages/ui/src/demo.tsx:523` — guard `board.statuses`.
3. Run the root command; confirm **all four** workspaces appear in the output.
4. **Reproduce `c8b94a4`**: drop `pids` from an `McpSessions` literal in
   `apps/gui/src/renderer/src/lib/update.test.ts`, confirm the **root** command
   fails, then revert. This is the box that proves the aggregate works rather
   than merely exists.
5. Update AGENTS.md §10 and the §6 command table to name the root command.
6. Add the root typecheck to `scripts/release.mjs`'s rail if it is not already
   covered there.
7. File the `demo.tsx` v2-era vocabulary as its own ticket.

## Verification

- The root `npm run typecheck` names `@kanmer/core`, `@kanmer/mcp-server`,
  `@kanmer/ui` and `@kanmer/gui` in its output — counted, not assumed.
- The `c8b94a4` error, reintroduced, fails the **root** command.
- Clean on unmodified `main` afterwards.
- `npm test`, `plugin:check`, `smoke:protocol`, `verify:agents-block` unchanged.

## Risks / open questions

- **`@kanmer/ui` may break again**, since nothing was checking it and it is now
  in the rail. That is the point, and it is better discovered by the rail than by
  a Claude Design consumer.
- **`--workspaces --if-present` hides a workspace that has no `typecheck`
  script** — it skips silently. Mitigated by step 3 counting the workspaces in
  the output rather than trusting exit code 0. If a fifth workspace appears
  without a `typecheck`, the count catches it.
- No open questions. The one judgement call — fix `demo.tsx` rather than exclude
  the workspace — is argued above and is the ticket's own stated intent
  ("no silent omissions").
