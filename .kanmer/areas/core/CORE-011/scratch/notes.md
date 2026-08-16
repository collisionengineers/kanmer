## Junction trap in the per-ticket worktree

Linking the root `node_modules` into a ticket worktree makes the workspace
symlink `node_modules/@kanmer/core` resolve to the **main checkout's**
`packages/core`, not the worktree's. So:

- `vitest` is correct — tests import `./gates.js` relatively, inside the worktree.
- `npm run build -w @kanmer/mcp-server` is **wrong** — it bundles the main
  checkout's core, silently producing a dist without the worktree's changes.

Caught it because the new smoke checks failed with the *old* error message while
`packages/core/dist` in the worktree did contain the new one, and
`packages/mcp-server/dist` did not.

Consequence for this workflow: cross-package builds and the smokes must run on
the **merged base in the main checkout**, not in the ticket worktree. That is
where `kanmer-verify` runs anyway, so the order is unchanged — but the worktree
rail cannot be trusted for anything that crosses a package boundary.

Rechecked [[CORE-012]]: its core tests ran under vitest (correct), and its
build/smoke/plugin verification was re-run in the main checkout after the merge,
which is recorded in its proof. That proof stands.
