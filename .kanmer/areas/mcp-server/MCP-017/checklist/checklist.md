# Checklist — MCP-017

## Contract inspection

- [ ] Read the canonical guard and all callers.
- [ ] Record current inputs, message, exit behavior, and invocation order.
- [ ] Read FRD-022 and AGENTS worktree invariant.
- [ ] Confirm configured/default board path and branch.
- [ ] Confirm no competing guard module is created.

## Pure classifier

- [ ] Reuse or extract one minimal pure classifier.
- [ ] Keep cwd/environment/Git discovery in adapter.
- [ ] Preserve user-facing refusal behavior.
- [ ] Return stable allowed/refused reason/code.
- [ ] Avoid a new shared package.

## Path vectors

- [ ] Exact board path refuses.
- [ ] Nested board path refuses.
- [ ] Relative board path refuses.
- [ ] Absolute board path refuses.
- [ ] Trailing separators normalize correctly.
- [ ] Mixed separators normalize correctly.
- [ ] Windows drive/path case normalizes correctly.
- [ ] POSIX case remains significant.
- [ ] Main checkout passes.
- [ ] Ordinary ticket worktree passes.
- [ ] `kanmer-copy`/prefix collision passes.
- [ ] Sibling path passes.
- [ ] Missing/non-Git/discovery error follows fail-safe contract.
- [ ] Supported override path/branch is tested.

## Disposable integration

- [ ] Create unique OS-temp Git repo.
- [ ] Configure local identity/default branch.
- [ ] Create initial commit.
- [ ] Create disposable `kanmer` board worktree.
- [ ] Create disposable ordinary ticket worktree.
- [ ] Assert real adapter refuses board worktree.
- [ ] Assert protected marker/write is not reached.
- [ ] Assert main checkout is allowed.
- [ ] Assert ticket worktree is allowed.
- [ ] Test nested cwd/path with spaces where supported.
- [ ] Test discovery failure.
- [ ] Capture stdout/stderr/exit diagnostics.
- [ ] Remove registered worktrees and temp dirs in teardown.
- [ ] Assert no real repo/board path was used.

## Runner and verification

- [ ] Add the test to the existing scripts test discovery path.
- [ ] Wire runner to root rail only if currently omitted.
- [ ] Add no new framework dependency.
- [ ] Run isolated guard test.
- [ ] Run complete scripts tests.
- [ ] Run `npm test`.
- [ ] Run `npm run typecheck` if applicable.
- [ ] Run `npm run verify`.
- [ ] Confirm no output/marker generated on refusal.
- [ ] Run `git diff --check`.
- [ ] Record exact vectors/output in post-implementation report.
- [ ] Stop before merge.
