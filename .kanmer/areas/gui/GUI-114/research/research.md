# GUI-114 research

## Finding and dependency

PR #168 finding `3836808787` is on `apps/gui/src/main/connect.ts` at the
Claude registration path. `providers.ts` currently builds
`KANMER_BOARD_BRANCH=<value>` into a single `claude mcp add ...` string, and
`connectAgent` executes that string through `execAsync`. Git permits a branch
such as `team&whoami`; the Windows command shell treats the ampersand as a
command separator when it is not safely serialized. This is a command
injection risk in the local Connect flow.

GUI-113 is merged into the cumulative CORE-043 branch at `69e2cc58` (PR #208).
Its provider-owned reconciliation and native descriptor staging are already
present and are out of scope here. GUI-114 must preserve those changes and
touch only the CLI registration serialization/execution seam.

## Current code map

- `apps/gui/src/main/providers.ts` owns `Invocation`, `RegisterSpec`, the
  Claude `cliAddCommand`, and the shared `q` copy-command formatter.
- `apps/gui/src/main/connect.ts` calls `register.addCommand` and sends the
  resulting string to `execAsync`; the same string is retained for the UI’s
  copy-paste fallback and error output.
- Codex and OpenCode use file serializers and do not shell the branch value.
  Grok/Antigravity use GUI-113’s staged native descriptors and argv-native
  plugin lifecycle; neither should be regressed or reimplemented here.
- Existing `NativeCommandRunner`/argv seams and provider registry tests can be
  extended for a production-safe CLI invocation without adding a dependency.

## Bounded design

1. Add an optional provider-owned argv builder to CLI registration specs. Keep
   the existing string builder as the human copy-paste representation.
2. Give Claude an argv builder returning `file: "claude"` and discrete args;
   pass `KANMER_BOARD_BRANCH=<value>` as one argv element. In production,
   `connectAgent` executes that descriptor with `execFile`, never a shell.
3. Retain the string command only as a safe display/fallback. Expand its
   shell-quoting predicate to quote command metacharacters such as `&`, `|`,
   `<`, `>`, `;`, `$`, backticks and parentheses, so the displayed command is
   not an invitation to execute a suffix.
4. Add a test-only argv runner seam and a synthetic CLI provider test proving
   `team&whoami` remains one argv value and no shell command is invoked. Add
   provider tests for exact Claude argv and safe copy-command formatting.

## Boundaries

No changes to MCP root discovery, GitHub Actions/protection, installer or
launcher lifecycle, provider ownership, GUI-113 reconciliation, native plugin
descriptors, dependencies, or unrelated projects. Hosted protection and a
real installed Claude host are unavailable here and remain INCONCLUSIVE.
