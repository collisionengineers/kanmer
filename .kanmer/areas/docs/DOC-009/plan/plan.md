# Plan — DOC-009

1. Create a ticket worktree and alter only the hand-authored plugin-repository map in AGENTS.md.
2. Replace the obsolete Codex-to-.mcp.json mapping with a skills-only Codex manifest description, and retain the Claude/grok config description.
3. Verify no managed-marker content changed, run `npm run verify:agents-block`, and inspect whitespace.
4. Commit, open a PR, independently review, then verify merged main and write proof.

No governing document changes are required; this is a correction to contributor documentation and `docs_todo` remains true.
