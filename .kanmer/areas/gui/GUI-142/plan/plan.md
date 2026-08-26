# Plan — GUI-142: F-015 complete Codex registration contract

## Objective
Correct only independent-review finding F-015 on PR #281 so Windows Codex registration staleness accepts the canonical portable launcher with no environment or with only the saved `KANMER_BOARD_BRANCH` environment entry, and reports every behavior-changing extra descriptor field or environment key as behind.

## Starting state
- PR #281 is open at exact head `34c74fd810113cb1c4571657136276b34924e695`; its 11-file diff and exact-head CI were reviewed in attestation version `279a2ac1bd8a5540`.
- The ticket has been returned to Preparing while its recorded branch `GUI-142-codex-stdio-registration` and worktree `.worktrees/GUI-142` remain.
- `packages/core/src/staleness.ts:isCurrentCodexRegistration` currently slices `[mcp_servers.kanmer]` with `kanmerTomlSection`, parses only `command` and `args`, and ignores all other assignments. Consequently an otherwise canonical entry with `cwd`, inline/dotted environment overrides, or a nested `[mcp_servers.kanmer.env]` containing `LOCALAPPDATA` is incorrectly current.
- GUI Connect's production caller `apps/gui/src/main/providers.ts:codexPortableInvocation` writes the canonical command/args and, when configured, exactly `env: { KANMER_BOARD_BRANCH: <normalized saved branch> }`; smol-toml serializes that environment as the child table `[mcp_servers.kanmer.env]`.
- The existing `files/files.md` already names both Core source/test files and the generated plugin bundle, so no file-map correction is needed.

## Governing docs
- **Meets** `docs/functional/frd/FRD-012-connect.md` R1e: the complete Windows descriptor is exactly canonical `command` plus `args`, with only the optional project-scoped `KANMER_BOARD_BRANCH` environment entry. `cwd`, `LOCALAPPDATA` overrides, roots, and every other descriptor field remain forbidden. This correction does not modify the FRD.

## Required changes
1. In `packages/core/src/staleness.ts`, tighten `isCurrentCodexRegistration` (with narrowly scoped TOML helpers beside `kanmerTomlSection` / `parseTomlStringArray`) to validate the whole Kanmer registration contract, not merely two selected values:
   - require exactly the canonical `command` and `args` values already defined by `CODEX_PORTABLE_ARGS`;
   - allow no other top-level descriptor key;
   - allow the environment to be absent, or to contain exactly one string entry named `KANMER_BOARD_BRANCH`;
   - reject `cwd`, inline or dotted `env.LOCALAPPDATA`, nested `[mcp_servers.kanmer.env]` keys other than `KANMER_BOARD_BRANCH`, extra sibling/child descriptor tables, duplicate/ambiguous contract assignments, and malformed supported shapes;
   - preserve existing accepted TOML spelling: quoted table-key components, CRLF, header/trailing comments, basic or literal strings, multiline args, and trailing array commas;
   - keep inspection scoped to Kanmer's table hierarchy and stop before unrelated MCP/provider tables. Do not broaden `kanmerRootIn` or scan another server's configuration.
2. In `packages/core/src/staleness.test.ts`, add focused regressions at `isCurrentCodexRegistration` and the Windows `detectStaleness` surface:
   - canonical command/args plus the generated child env table containing only `KANMER_BOARD_BRANCH` is current;
   - canonical command/args plus `cwd` is false/behind;
   - canonical command/args plus redirected `LOCALAPPDATA` in the environment is false/behind;
   - another forbidden environment key is false, while unrelated tables after Kanmer remain ignored;
   - retain every current formatting and legacy-descriptor regression unchanged.
3. Rebuild `plugins/kanmer/mcp/kanmer-mcp.cjs` from the corrected Core source. No hand edit of the bundle.

## Expected files
| Action | Repo-root-relative path | Responsibility |
|---|---|---|
| Modify | `packages/core/src/staleness.ts` | Complete-contract verdict in `isCurrentCodexRegistration` and narrow TOML parsing helpers. |
| Modify | `packages/core/src/staleness.test.ts` | F-015 negative and permitted-environment regressions. |
| Regenerate | `plugins/kanmer/mcp/kanmer-mcp.cjs` | Committed standalone bundle produced by `npm run plugin:build`. |

## Do not modify
- `apps/gui/src/main/providers.ts`, `connect.ts`, or their tests: Connect already emits the intended contract.
- FRD-012, README, AGENTS.md, examples, unrelated staleness artefacts, provider registrations, ticket metadata, or PR history.
- MCP-052 remote/OAuth/tunnel scope.
- Dependencies or package manifests.

## Constraints
- Dependency-free Core parsing; do not add a TOML package.
- A conservative verdict is required: an ambiguous or unsupported Kanmer descriptor shape is not current.
- Preserve non-Windows behavior: the Windows descriptor rule must still emit no staleness row on non-Windows.
- Preserve user-owned unrelated TOML tables and all existing explicit-root extraction behavior.
- Do not weaken or delete assertions, and do not discard a failing command result.

## Ordered steps
1. Re-read PR #281 head and ensure the worktree is still clean and exactly at `34c74fd810113cb1c4571657136276b34924e695`; stop if head or diff changed.
2. Add the three required failing Core regressions first: forbidden `cwd`, redirected `env.LOCALAPPDATA`, and permitted generated `[mcp_servers.kanmer.env]` containing only `KANMER_BOARD_BRANCH`.
3. Tighten `isCurrentCodexRegistration` and its narrow TOML helpers to enumerate and validate the complete main/child-table contract while preserving the existing formatting corpus and unrelated-table boundary.
4. Run the focused Core regression suite and Core typecheck; fix only failures caused by this bounded correction.
5. Run the full repository test rail, regenerate the plugin bundle, and run plugin sync/isolated-handshake checks.
6. Record exact exit codes in the implementation report/scratch, commit only the three expected files, push the existing PR branch, and obtain fresh exact-head CI plus a new independent review. Do not resolve F-015 by assertion alone.

## Acceptance checks
- `isCurrentCodexRegistration` returns `true` for the exact GUI-generated bare descriptor and for its optional `KANMER_BOARD_BRANCH` child environment table.
- It returns `false` for the same command/args with `cwd`, `env.LOCALAPPDATA`, any other environment key, or any other behavior-changing descriptor field.
- On Windows, `detectStaleness` reports those forbidden shapes as `mcp-registration: behind`; on non-Windows it continues not to judge the Windows descriptor.
- Existing quoted-key, comment/CRLF, literal-string, multiline-array, legacy descriptor, and other-server isolation tests remain green.
- `plugins/kanmer/mcp/kanmer-mcp.cjs` is regenerated and `plugin:check` proves source/bundle parity and the isolated handshake.

## Commands
Run from `.worktrees/GUI-142`:
- `git status --short --branch; git rev-parse HEAD; gh pr view 281 --json headRefOid`
- `npm test -w @kanmer/core -- --run src/staleness.test.ts`
- `npm run typecheck -w @kanmer/core`
- `npm test`
- `npm run plugin:build`
- `npm run plugin:check`
- after push: `gh pr checks 281 --watch`

## Failure and deviation rules
Stop and report: a head/diff mismatch; a need to change GUI emission or FRD-012; a TOML shape that cannot be validated conservatively without a dependency; any focused/full/plugin failure; unrelated dirty files overlapping the three expected paths; or scope expansion beyond F-015. Preserve the first failure in the execution record even if a corrected command later passes.

## Stop condition
Stop after one tightly bounded F-015 correction commit is pushed to existing PR #281, fresh exact-head required checks pass, and the ticket is handed to a new independent reviewer. Do not merge, verify, close, start MCP-052, or move GUI-142 beyond Review.
