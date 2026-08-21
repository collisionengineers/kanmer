# Post-implementation report — MCP-034

## Summary

Closed the three independent-review findings from MCP-022 without changing project-token semantics, core gate wording, tool count, dependencies, or error-code vocabulary. Windows-looking identity vectors now resolve deterministically across hosts, single-boundary `leaving … requires …` refusals receive `GATE_BLOCKED` while retaining legacy text, and user-owned AGENTS.md documents the optional compatibility field plus the annotation dependency of the central write guard. The standalone plugin bundle was regenerated.

## Changes

| File | Change | Why |
|---|---|---|
| `packages/mcp-server/src/project-identity.ts` | Detect Windows drive/UNC absolute inputs and resolve them with `path.win32.resolve`; retain native `path.resolve` otherwise. | The MCP-022 smoke vector previously became cwd-dependent on Linux/macOS. |
| `packages/mcp-server/src/errors.ts` | Extend the existing narrow gate classifier to `entering|leaving … requires …`; retain collapsed-pipeline matching and exactly three codes. | Core's single-boundary leaving refusal was the remaining uncoded gate form. |
| `packages/mcp-server/src/smoke.mjs` | Require `structuredContent.error.code === "GATE_BLOCKED"` on the existing leaving-boundary probe. | Locks the regression while preserving the existing legacy error-text assertion. |
| `AGENTS.md` | Add user-owned project-safe-write guidance for `get_status.compat.expectedProject`, optional top-level `expected_project`, and SDK `annotations.readOnlyHint: false` as the central-guard dependency. | Closes the governance finding without editing managed markers or creating a second canonical block. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Regenerated standalone bundle. | The committed plugin artifact must carry server source changes. |

## Governing docs

- `docs/architecture/adr/ADR-0016-compiled-workflow.md`: retained the compiled central write guard, structured error supplement, compatibility text, unchanged tool registry, and committed artifact workflow.
- `docs/functional/frd/FRD-022-mcp-server-surface.md`: retained optional machine-local project compatibility and the exact three structured codes; completed the remaining gate classification and operating-guide convention.
- MCP-022's merged implementation/proof and independent review provided the bounded remediation scope. No governing document was modified.

## Verification hand-off

Run on merged main:

- `npm run typecheck`
- `npm run build`
- `node packages/mcp-server/src/smoke.mjs`
- `npm run smoke:protocol`
- `npm run smoke:discovery`
- `npm run test:http -w @kanmer/mcp-server`
- `npm run verify:agents-block`
- `npm run plugin:build`
- `npm run plugin:check`
- `git diff --check`

The ticket-worktree results were: MCP typecheck/build pass; 184/184 stdio smoke; 42/42 protocol smoke; 13/13 discovery smoke; 61/61 focused HTTP/doctor tests; 31/31 AGENTS-block checks; all-workspace typecheck pass; and committed-bundle stdio/protocol smoke pass. The first aggregate `npm test` run reached 256 core and 318 GUI tests but recorded one nested HTTP `spawnSync … ETIMEDOUT` failure in `project resolution fails before binding and leaves no listener`; that failure remains disclosed rather than erased. A complete rerun of the exact `npm test` command then exited 0: core 256/256, GUI 318/318, HTTP 61/61, scripts 66/66. The transient timeout is therefore dispositioned as a rerun-only environment failure, with the successful full rail as the acceptance result.

## Risks / follow-ups

- `npm run plugin:check` intentionally refuses the linked worktree because its workspace dependency resolves to the canonical checkout. The generated bundle was smoke-tested; independent review/merged-main verification must run the canonical plugin check.
- No new token semantics, mandatory rollout, error codes, tools, dependencies, core changes, tool-reference rows, MCP-023 work, or managed AGENTS block edits were included.
- The first aggregate `npm test` timeout is retained for auditability; the exact full rail was rerun successfully and must be repeated on merged main.

## Traceability

- Commit: `3e4d6a34201ac0115bc879299e57d5713ee1ef2c` (`fix(mcp): close MCP-022 review findings`)
- Branch: `mcp-034-close-mcp022-findings`
- Worktree: `.worktrees/mcp-034`
- Follow-up source: [[MCP-022]]
