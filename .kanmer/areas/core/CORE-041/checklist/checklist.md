# Checklist — CORE-041

- [x] Derive the active Windows drive in `packages/mcp-server/src/smoke.mjs` for POSIX-vector expectations without changing production identity code.
- [x] Preserve explicit Windows canonical-path and exact ordered fingerprint assertions.
- [x] Run focused smoke, server build/typecheck, scripts rail, and diff checks; record exact exit codes.
- [ ] Write the post-implementation report, record traceability, push the branch, and open the PR for independent review.

## Progress notes

- The first `npm run test:scripts` attempt exited 1 with 78/80 passing because the fresh worktree did not yet have `packages/core/dist/index.js`; the two missing-dist failures are preserved as an environment/setup boundary.
- After `npm run build:core`, `npm run test:scripts` exited 0 with 80/80 passing.
- `npm run build:server` exited 0; `node packages/mcp-server/src/smoke.mjs` exited 0 with 224/224 checks passing, including project identity canonicalization and exact fingerprint checks.
- `npm run typecheck -w @kanmer/mcp-server` exited 0 and `git diff --check` exited 0.
