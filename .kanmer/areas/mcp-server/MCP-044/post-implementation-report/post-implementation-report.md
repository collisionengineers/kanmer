# MCP-044 post-implementation report

## Outcome

MCP-044 propagates the saved GUI `kanmerBranch` convention into every
Invocation-backed local project-scoped MCP registration. Codex keeps its exact portable, rootless
installer launcher command and receives only `KANMER_BOARD_BRANCH`; the
Electron-as-Node registrations retain `ELECTRON_RUN_AS_NODE` and add the same
branch environment. Blank/whitespace input normalizes to the default branch.
The Connect IPC handler reads the current saved setting and threads it through
`connectAgent` and `serverInvocation`. Grok and Antigravity are native
user-scoped plugin providers, not project registration writers, so their
installer-owned plugin descriptors remain unchanged by this remediation.

The canonical managed instructions now distinguish local registration/export
from the hosted Actions repository-variable mirror. `AGENTS.md` and the
`kanmer-setup` fenced block are synchronized, and FRD-012 R1e documents the
project-scoped environment exception without weakening rootless portability.

## Scope and governing documents

- Source: `apps/gui/src/main/providers.ts`, `connect.ts`, `index.ts`.
- Tests: `apps/gui/src/main/providers.test.ts`, `connect.test.ts` (Codex,
  Claude, OpenCode and the Connect threading seam).
- Managed prose: `scripts/agents-block-body.mjs`, generated `AGENTS.md`, and
  `plugins/kanmer/skills/kanmer-setup/SKILL.md`.
- Governing update: `docs/functional/frd/FRD-012-connect.md` R1e.
- Read-only context: FRD-020, ADR-0016, and the current CORE-043 finding
  #3836189723. No CORE-043 source, workflow, GitHub API, installer, plugin
  manifest, or dependency changes were made.

## Evidence and exact exits

| Command | Exit | Result |
| --- | ---: | --- |
| `npm run test -w @kanmer/gui -- --run src/main/providers.test.ts src/main/connect.test.ts` | 0 | 96/96 focused tests |
| `npm run test -w @kanmer/gui -- --run` | 0 | 45 files, 392 tests |
| `npm run typecheck -w @kanmer/gui` | 0 | node + web projects |
| `npm run typecheck` | 0 | core, mcp-server, ui and gui workspaces |
| `npm run build` | 0 | core and mcp-server ESM/standalone builds |
| `npm run build -w @kanmer/gui` | 0 | electron-vite main/preload/renderer build |
| `npm run check:manual` | 0 | manual current, 22 chapters |
| `npm run verify:docs` | 0 | docs/manual/link checks pass |
| `npm run verify:agents-block` | 0 | 31/31 managed-block checks pass |
| `npm run verify:skills` | 0 | all skill-prose checks pass after wording correction |
| `npm run test:scripts` | 0 | 88/88 script tests pass |

The first `npm run verify:skills` attempt exited 1 because the new managed
prose literally contained `` `kanmer-board` ``, which the skill validator
correctly classified as a nonexistent skill reference. The wording was
changed to “the default board branch”; the rerun passed. This failed attempt
is retained rather than hidden.

Two repository rails were unavailable in this checkout and remain explicit
boundaries: `npm run plugin:check` exited 1 because `@kanmer/core` resolved to
the main checkout's `packages/core/dist` instead of this linked worktree; and
`npm run check:diff` exited 1 because no such npm script exists. The source
worktree was not mutated to repair either shared setup condition. The
managed-block, skill, docs, type, build and test evidence above is still
independent of those failures.

## External boundary and risks

No GitHub Actions variable, branch-protection setting, installed provider
configuration, HKCU state, or live host was mutated. Hosted protection and
provider/installer lifecycle behavior are therefore INCONCLUSIVE here. The
local deterministic proof covers serialization, normalization, preservation of
unrelated configuration, and the Connect threading seam; a reviewer may use a
disposable host for the remaining live check.

## Handoff

This report is prepared for the Implementing → Review boundary. The dedicated
branch/worktree remains clean except for MCP-044 changes until commit/push.
The author must not self-review or merge.
