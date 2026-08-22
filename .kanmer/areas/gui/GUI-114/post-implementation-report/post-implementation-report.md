# GUI-114 post-implementation report

## Outcome

Implemented shell-safe Claude project registration for the GUI-114 finding
3836808787. Claude's registration now exposes a provider-owned executable and
argv descriptor and `connectAgent` executes that descriptor through the
existing `execFile`-based native runner in production. The rendered command is
retained as a human copy/paste fallback and quotes shell metacharacters. The
hostile branch `team&whoami` remains one argv value and cannot invoke a shell
command.

The change is based on GUI-113's merged cumulative parent
`69e2cc582b7ee8947f0febda6d286c18e21397a7` and is limited to Claude/CLI
registration. Codex/OpenCode file registration and GUI-113 native plugin
staging are unchanged.

## Changed files

- `apps/gui/src/main/providers.ts` — optional CLI argv descriptor, Claude argv
  builder, and shell-metacharacter-safe display quoting.
- `apps/gui/src/main/connect.ts` — production argv execution through
  `execFile`, with a deterministic test seam.
- `apps/gui/src/main/providers.test.ts` — exact Claude argv and hostile branch
  display coverage.
- `apps/gui/src/main/connect.test.ts` — proves hostile branch text is passed as
  one argv value and the shell runner is not called.

## Rails and exact outcomes

| Command | Exit | Evidence |
| --- | ---: | --- |
| `npm run test -w @kanmer/gui -- --run src/main/providers.test.ts src/main/connect.test.ts` | 0 | 99/99 PASS (66 provider, 33 connect) |
| `npm run test -w @kanmer/gui -- --run` | 0 | 48 files, 418 tests PASS |
| `npm run typecheck` | 0 | core, mcp-server, ui, gui all typechecked |
| `npm run build` | 0 | core and mcp-server builds PASS |
| `npm run build -w @kanmer/gui` | 0 | Electron main/preload/renderer build PASS |
| `npm run test:scripts` (first run) | 1 | 87/89; fresh checkout lacked `packages/core/dist/index.js` for `auto-run-state.test.mjs` and `release-notes.test.mjs` |
| `npm run test:scripts` (after build) | 0 | 89/89 PASS; the initial failure is preserved above |
| `npm run verify:docs` | 0 | docs/manual/link checks PASS |
| `npm run check:manual` | 0 | manual current, 22 chapters |
| `npm run verify:agents-block` | 0 | 31/31 checks PASS |
| `npm run verify:skills` | 0 | all skill prose checks PASS |
| `git diff --check` | 0 | no whitespace errors |
| `npm run plugin:check` | 1 | unavailable in this linked worktree: workspace `@kanmer/core` resolved to the main checkout rather than this checkout |
| `npm run mcpb:check` | 1 | unavailable local tool: `@anthropic-ai/mcpb/dist/cli/cli.js` is not installed |

The two unavailable linked-worktree/tooling results are preserved as
INCONCLUSIVE, not treated as implementation failures. Hosted branch
protection, a real Windows Claude installation, and live registration proof
are also INCONCLUSIVE in this lane; they require the independent reviewer or
an available host.

## Handoff

The dedicated branch is `gui-114-shell-safe-env`, worktree
`.worktrees/gui-114`, targeting `core-043-protection-retarget`. The commit and
PR are recorded in the ticket after push. The ticket is ready to stop at
Review for independent review; no merge, verification, or cleanup was done.
