# Plan — SKILL-019: Move OpenCode Kanmer skills to .opencode/skills

## Approach

Change only OpenCode’s copySkills destination from the cross-agent .agents/skills tree to OpenCode’s native .opencode/skills tree. Rely on Connect’s existing destination-equality peer logic rather than adding migration code: once destinations differ, OpenCode disconnect owns only .opencode and Antigravity continues owning .agents. Add the new destination to staleness and gitignore, update focused tests, and correct governing prose. Do not delete legacy .agents content because it may still serve Antigravity.

## Governing docs

- **FRD-012 — Modifies with explicit user authorization.** Update R2, R4, and acceptance criterion 2 so OpenCode uses .opencode/skills and Antigravity alone retains .agents/skills. Preserve all MCP registration behavior.
- **FRD-023 — Meets.** The change continues to install the same atomic roster and follows its delegated FRD-012 install matrix; no roster or release-rail change.
- **ADR-0009 — Modifies with explicit user authorization.** Correct the convergence note and consequence to reflect provider isolation for OpenCode while preserving the installed-binary evidence method and Antigravity caveat.

## Steps

1. Change OpenCode’s provider destination/comment to .opencode/skills.
2. Add .opencode/skills to staleness destinations and .gitignore while retaining .agents/skills.
3. Update provider, disconnect, and staleness tests for independent OpenCode/Antigravity ownership.
4. Correct FRD-012, ADR-0009, and AGENTS.md statements; leave FRD-023 unchanged unless a direct contradiction is found.
5. Run focused GUI/core tests, root typecheck/tests, and the applicable skill/AGENTS/plugin rails.
6. Commit, push, open the PR, and record the implementation report and traceability.

## Verification

Run focused providers/connect/staleness tests and confirm both destination assertions. Run npm test and npm run typecheck. Run npm run verify:skills and npm run verify:agents-block; build and plugin:check if the touched rail requires it. Review the diff for zero Antigravity production changes and no legacy .agents deletion.

## Risks / open questions

- Existing OpenCode copies under .agents remain until broader reconciliation; this is deliberate because ownership is ambiguous while Antigravity stays there.
- Staleness will inspect both .opencode and .agents when both exist; that correctly reflects two connected providers.
- Documentation must not overclaim that the overall Codex duplicate is fixed.
