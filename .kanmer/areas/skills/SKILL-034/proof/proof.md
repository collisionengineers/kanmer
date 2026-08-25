# Proof — SKILL-034

## Verdict

PASS at exact GitHub merge SHA `ca9d996bf918e16145cdf16575a423025d8224f3` (PR #257).

The merged plugin payload contains the canonical setup reconciler at the exact version-root path addressed by the installed `kanmer-setup` skill. A cache-shaped isolated copy executes successfully, preserves user prose, is byte-idempotent on a second run, and refuses malformed markers without changing the file. Generated files are byte-pinned to their canonical sources by `plugin:check`.

## Verification environment

- Disposable detached worktree: `.worktrees/verify-skill-034`
- Revision: `ca9d996bf918e16145cdf16575a423025d8224f3`
- Dependency install: `npm ci`
- Hosted checks on PR #257: `kanmer-gate` PASS; `verify` PASS
- Independent review attestation: `scratch/review.md` version `2b02b4e4454666a0`

## Attempts

### Attempt 1 — FAIL (verifier environment)

The first `npm run plugin:build` attempt failed during the standalone MCP build because the detached worktree had not completed its own workspace installation and resolved `@kanmer/core` through the main checkout. Esbuild correctly surfaced missing exports from that wrong checkout. This was an invalid verification environment, not a product pass, and is retained here per the no-erasure rule.

Remediation: completed `npm ci` in the detached worktree and confirmed `node_modules/@kanmer/core` targets `.worktrees/verify-skill-034/packages/core`.

### Attempt 2 — PASS

All commands exited 0:

- `npm run plugin:build`
- `npm run plugin:check`
- `node --test scripts/plugin-setup-runtime.test.mjs` — 2/2
- `npm run verify:agents-block` — 31/31
- `npm run test:scripts` — 104/104
- `npm run verify:skills`
- `git diff --exit-code`
- `git status --short` — clean

## Claims proven

1. The marketplace-shipped plugin includes `scripts/agents-block.mjs` and its canonical body dependency.
2. The path obtained by resolving `../../scripts/agents-block.mjs` from `skills/kanmer-setup` works in a versioned installed-cache-shaped copy.
3. Running setup twice is byte-idempotent and retains repository-owned prose.
4. Malformed managed markers return nonzero and leave `AGENTS.md` byte-identical.
5. Missing or drifted generated setup files are rejected by the same plugin synchronization gate used by CI.
6. No alternate managed-block implementation or new dependency was added.

## Delivery

The code and committed plugin artifact are on `main`. Distribution to installed clients is intentionally owned by release ticket [[CORE-103]]; this ticket introduces no separate deployment.
