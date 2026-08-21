# Plan — MCP-034: close MCP-022 review findings

## Approach

Make the smallest remediation on the already-merged MCP-022 surface: choose `path.win32.resolve` only for unmistakable Windows absolute vectors so identity smoke is host-independent without changing native path semantics; extend the existing error classifier with only core's single-boundary `leaving … requires …` wording; and add the missing convention to user-owned `AGENTS.md`. Extend existing smoke assertions rather than introducing a new test framework or changing core messages. Rebuild the standalone bundle because server source changes are shipped through it. This closes the three review findings while preserving MCP-022's optional compatibility, exact three-code union, tool count, and no-new-dependency boundary.

## Governing docs

- **Meets `docs/architecture/adr/ADR-0016-compiled-workflow.md`:** preserve the compiled MCP surface, central write-guard annotation contract, existing human-readable errors, structured error payloads, and generated plugin artifact. No workflow or token semantics change.
- **Meets `docs/functional/frd/FRD-022-mcp-server-surface.md`:** preserve machine-local `expected_project` compatibility and exactly the existing three codes; ensure the remaining core gate refusal is coded as `GATE_BLOCKED`; keep unrelated errors uncoded; document the convention in the repository operating guide.
- **Linked implementation context:** MCP-022's merged implementation/proof and its independent review define the three bounded findings. No governing document is modified by this ticket.

## Steps

1. Re-read the MCP-022 review finding, current merged sources, smoke/protocol rails, and AGENTS managed-block ownership immediately before editing; confirm the ticket remains untaken and the scope is limited to the three findings.
2. Update `canonicalProjectPath` to detect Windows drive/UNC absolute inputs and resolve those with `path.win32.resolve`; keep host-native `path.resolve` for native inputs and retain slash, drive-letter, root, and payload rules.
3. Update `smoke.mjs` so Windows-looking identity expectations are invariant across host OSes and the existing leaving-boundary gate probe asserts `GATE_BLOCKED` while legacy error text remains present.
4. Extend `errors.ts` with only the core single-boundary `leaving … requires …` classifier; retain `WRONG_PROJECT`, `REVISION_CONFLICT`, `GATE_BLOCKED`, compatibility text, and uncoded unrelated validation.
5. Add a concise user-owned `AGENTS.md` subsection: clients sniff `get_status.compat.expectedProject` before sending optional top-level `expected_project`; every mutating registration must carry SDK `annotations.readOnlyHint: false` because the central wrapper uses it to attach the guard. Leave managed markers, `agents-block-body.mjs`, and the setup-skill fence unchanged.
6. Build the MCP server and regenerate `plugins/kanmer/mcp/kanmer-mcp.cjs`; verify the generated artifact is the only bundle change and the tool count/reference rows remain unchanged.
7. Run the full scoped rails, record exit codes/output, tick the checklist, and write the post-implementation report. Do not move past Review or merge; independent review owns that boundary.

## Verification

Run from the MCP-034 worktree:

- `npm run typecheck -w @kanmer/mcp-server`
- `npm run build`
- `node packages/mcp-server/src/smoke.mjs` (including invariant Windows identity and leaving-boundary `GATE_BLOCKED`)
- `npm run smoke:protocol`
- `npm run smoke:discovery`
- `npm run test:http -w @kanmer/mcp-server`
- `npm run verify:agents-block`
- `git diff --check`

Run `npm run plugin:check` only from a normal checkout after the branch is merged/rebased into the canonical main checkout; the linked-worktree guard intentionally refuses that check. The post-implementation report must hand off this exact merged-main plugin check plus the scoped rails to independent review/verification.

## Risks / open questions

- Treating every string containing `leaving`, `requires`, or `blocked` as a gate would misclassify validation. Match the explicit core gate shape only.
- Calling host-native resolution for a Windows-looking vector reintroduces the cross-host failure; use `path.win32` only for drive/UNC absolute inputs.
- Editing the managed AGENTS block or its fenced copy creates generated drift. Add guidance only to user-owned prose and run the block verifier.
- Building the committed bundle from the wrong checkout can capture stale source; build from the MCP-034 worktree for the branch artifact and reserve `plugin:check` for canonical merged main.
- No unresolved design questions remain; no new token semantics, error codes, tools, dependencies, or MCP-023 work are permitted.

## Stop condition

Stop with MCP-034 in Review, taken on its own branch/worktree, with scoped tests green, AGENTS block verification green, generated bundle refreshed, post-implementation report written, commit/PR traceability recorded, and no merge or proof performed by this agent.
