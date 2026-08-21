# CORE-011 proof

## Merged implementation

- PR #15 merged; scoped implementation b5b332e0474081c17cda348a6fb5166c29788ae0 is reachable from main (merge 8af1991c8350ae4bf7b44532dd434ee24ce7b8e4).
- The move engine rejects a single call crossing more than one gated boundary, preserves chore/spike exceptions, and stamps first-entry stageEntered history without overwriting it.

## Verification

- Focused gates/store tests: PASS, 95/95.
- Full core test suite: PASS, 257/257.
- Workspace typecheck, core/server/GUI builds, stdio 184/184, protocol 42/42, discovery 13/13, and git diff --check: PASS.
- Main checkout npm run plugin:build: PASS.
- Main checkout npm run plugin:check: PASS (30 tools, byte parity, manifests/frontmatter, isolated handshake).

The linked worktree plugin:check refusal was an environment resolution limitation and is superseded by the passing normal-main check above.
