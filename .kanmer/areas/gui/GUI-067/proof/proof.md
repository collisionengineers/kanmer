# Proof — GUI-067

PR [#36](https://github.com/collisionengineers/kanmer/pull/36), merged as
**`5d0e0d7`**. Commit `2707605`. Three files, +8 −3. Run on merged `main`.

## The command exists and names every workspace

```
$ npm run typecheck
> @kanmer/core@0.1.0 typecheck
> @kanmer/mcp-server@0.1.0 typecheck
> @kanmer/ui@0.2.0 typecheck
> @kanmer/gui@0.3.2 typecheck
exit=0
```

Four workspaces, **counted** rather than inferred from exit 0 — because
`--if-present` skips a workspace with no `typecheck` script *silently*, which is
the one way this can regress into the defect it fixes. That caveat is written
into AGENTS.md §10 beside the command.

## Falsification: it fails on the exact bug it was built for

`c8b94a4` reintroduced by dropping `pids` from the line-9 literal:

```
$ sed -i '9s/, pids: \[\]//' apps/gui/src/renderer/src/lib/update.test.ts
$ npm run typecheck
src/renderer/src/lib/update.test.ts(9,7): error TS2741: Property 'pids' is missing
  in type '{ count: number; projects: never[]; unknown: false; }'
  but required in type 'McpSessions'.
exit=2
```

Reverted; `git diff --stat` empty. This is the box that distinguishes a command
that *exists* from one that *works*, and it is the reason the ticket asked for it
in that shape.

## Rail, on merged `main` (`5d0e0d7`)

```
npm run typecheck            4 workspaces, exit 0
npm test                     core 182 passed · gui 202 passed
npm run plugin:check         29 tools match, bundle bytes match
npm run smoke:protocol       26/26
npm run verify:agents-block  26/26
npm run check:manual         up to date (12 chapters)
```

## What the ticket got wrong, corrected here

It said the root typecheck "does not reach the `@kanmer/gui` workspace". There
was **no root typecheck script at all** — `node -p "require('./package.json').scripts.typecheck"`
returned `undefined`. So AGENTS.md §10 named a per-workspace command, and anyone
following the checklist type-checked one workspace of four while reporting
"typecheck clean". That is not a smaller version of the stated problem; it is a
worse one, because the checklist read as if it covered the repo.

Its second claim needed no fix: `apps/gui/tsconfig.web.json` includes
`src/renderer/**/*`, which already covers `*.test.ts`. The GUI's own config was
never the gap, and changing it would have been work against a symptom.

## The ordering was load-bearing

**[[GUI-078]] had to land first.** `@kanmer/ui` had a `typecheck` script nothing
had ever run, and the first honest aggregate turned the rail red with 12 errors —
which then turned out to be masking 12 absent `ProjectClient` methods.

Excluding the workspace to get green would have reproduced this ticket's own
defect exactly: a rail that reports success over something it does not cover. The
ticket was paused, the blocker filed, and it resumed — which is the process
working rather than a delay.

## What this run does NOT prove

- **`--if-present` still hides a scriptless workspace.** The mitigation is a
  human counting four names in the output, written into §10. A fifth workspace
  added without a `typecheck` script would pass silently. The real fix is
  asserting the workspace list, and that belongs with [[CORE-025]]'s question
  about what else the rail should check.
- **Nothing here makes vitest typecheck.** The ticket's second stated gap —
  "a full green test run says nothing about types in test files" — is still true;
  it is now *covered* by a separate command rather than closed. Type errors in
  test files are caught by `npm run typecheck`, not by `npm test`.
- **No CI runs any of this.** Every command above is one a human or agent must
  choose to run. AGENTS.md §10 is still the only enforcement, and it is prose.

---

**Merged:** PR [#36](https://github.com/collisionengineers/kanmer/pull/36) —
merge commit `5d0e0d7`. `docs_todo: true`, correctly: this implements no product
behaviour and no governing doc covers it. Unblocked by [[GUI-078]].
