# Research — MCP-034: close MCP-022 review findings

## Question

What is still wrong in the merged MCP-022 project-fingerprint/structured-error implementation, and what is the smallest safe change that closes the three independent-review findings without changing token semantics, tool count, or unrelated documentation?

## Findings

- The independent post-hoc review is recorded in MCP-022's `scratch/independent-review` and names three follow-ups: non-portable Windows-looking identity vectors (P1), uncoded single-boundary `leaving … requires …` gate refusals (P2), and missing AGENTS.md guidance for the compatibility convention and annotation dependency (P1 governance). The review explicitly marks MCP-033's plugin-artifact issue closed.
- `packages/mcp-server/src/project-identity.ts` currently calls host-native `path.resolve(input)` before slash normalization. On Windows, a Windows-looking absolute string such as `C:\\Kanmer\\Board\\` resolves as intended; on Linux/macOS the same string is treated as a relative filename and becomes a path under the process cwd. The existing `smoke.mjs` vector unconditionally expects `c:/Kanmer/Board`, so the cross-host claim fails on non-Windows.
- The identity contract itself is already correct and must not change: payload order is `{ boardRoot, format, repoRoot }`, paths use resolved absolute form with slash separators, only the initial Windows drive letter is lowercased, trailing separators are removed except root/drive-root, and `boardSource` is display-only. Native POSIX paths must continue using the host-native resolver.
- `packages/mcp-server/src/errors.ts` defines exactly `WRONG_PROJECT`, `REVISION_CONFLICT`, and `GATE_BLOCKED`. Its classifier covers `Conflict:`, `entering … requires …`, and collapsed-pipeline `cannot move … crosses …` text, but it omits the core store's single-boundary message `<id> cannot move …: leaving <stage> requires <requirements> …`. `packages/core/src/store.ts` is the source of that wording; its text is load-bearing and must remain unchanged.
- `packages/mcp-server/src/smoke.mjs` already asserts Windows-looking identity output, source-independent fingerprints, and entering/collapsed gate codes. Its existing `Gate probe` leaves Backlog without a governing ref and currently checks only error text; it is the natural regression assertion for `GATE_BLOCKED` on a leaving-boundary refusal.
- The central write guard in `packages/mcp-server/src/index.ts` decorates mutating schemas only when the registration annotation has `readOnlyHint: false`, extracts/compares/strips optional top-level `expected_project` before actor attribution and `ensureInit()`, and advertises `compat.expectedProject: "optional"` from `get_status`. A future mutating registration that omits the annotation silently bypasses this central decoration.
- The canonical MCP tool reference already documents top-level `expected_project`, capability sniffing, and the three structured codes. The repository's user-owned `AGENTS.md` only says annotations are generally required and does not explain that `readOnlyHint: false` is the guard dependency or that clients must sniff `get_status.compat.expectedProject` before sending the optional field.
- The managed AGENTS block is generated from `scripts/agents-block-body.mjs` and mirrored in `plugins/kanmer/skills/kanmer-setup/SKILL.md`; MCP-034 should add the new convention to the user-owned AGENTS prose, not edit marker-delimited managed content or create another copy.
- MCP-022 is merged at implementation commit `7283abf6705089cf536494db99fcbb18876a2ece` (PR #102, merge `f148769993472ede046cc6201645a5080481eebd`) and its current merged-main rails are green. MCP-034 has no existing branch/worktree or implementation to audit.

## Implications

- Make `canonicalProjectPath` detect Windows-looking absolute inputs and resolve them with `path.win32.resolve` (including drive and UNC forms), while retaining host-native `path.resolve` for native paths. Keep normalization and payload/hash rules unchanged.
- Keep error classification narrow: add only the core single-boundary `leaving … requires …` signature to the existing classifier; do not classify generic `blocked` or arbitrary validation text. Extend the existing gate smoke assertion to prove the structured code while preserving legacy text.
- Add a concise user-owned AGENTS.md subsection describing the optional top-level `expected_project` capability contract and the central guard's dependency on `readOnlyHint: false` for every mutating registration. Do not alter the managed block or tool-reference semantics.
- Refresh the committed standalone plugin bundle after source changes, but do not add dependencies, tools, project-token semantics, or new error codes.

## Open questions

No unresolved design questions remain. The review provides exact required behavior and all implementation choices above preserve MCP-022's existing contracts.
