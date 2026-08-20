# Plan — MCP-017: unit-test the worktree guard

## Objective

Give the existing board-worktree safety guard direct, deterministic coverage through the repository's scripts test runner, proving canonical board paths are refused before any protected action while normal checkout and ticket-worktree paths remain allowed.

## Starting state

- A worktree guard is used by one or more build/release/server scripts.
- The guard has no direct unit suite.
- `scripts/` now has a canonical test runner.
- CORE-034 separately owns `takeTicket` path refusal and board-health reporting.

## Required changes

### 1. Locate and freeze the production contract

1. Read the canonical guard entry point/helper and every caller.
2. Record its current inputs, output/throw behavior, exit code, message, and the earliest point it executes in each caller.
3. Confirm the configured board worktree convention and any environment override.
4. Confirm whether it classifies paths, Git common-dir/worktree facts, branch, or a combination.
5. Read FRD-022 and AGENTS board-worktree instructions.
6. Do not change behavior until tests capture the current intended contract.

### 2. Isolate pure classification

7. If already pure/exported, reuse the existing function.
8. Otherwise extract the smallest pure classifier from the current module without changing its entry-point side effects.
9. Give the classifier resolved/canonical facts as arguments; it must not read cwd/environment or spawn Git.
10. Return a typed/object decision such as `{allowed, code, reason}` or the repository's existing equivalent.
11. Keep environment/Git discovery in the current adapter.
12. Ensure caller-facing message/exit behavior remains unchanged.
13. Do not add a new shared package solely for this extraction.

### 3. Define canonical path vectors

14. Build one table containing POSIX and Windows-style examples.
15. Include exact board path, nested board path, relative board path, absolute board path, trailing separators, mixed separators, drive-letter case, and Windows path case.
16. Include normal main checkout and `.worktrees/<ticket-id>` acceptance.
17. Include prefix collision such as `kanmer-copy` and sibling paths.
18. Include missing/non-Git/discovery-error facts according to the existing fail-safe contract.
19. Include configured alternate board path/branch when the production guard supports it.
20. Reuse the same vectors in CORE-034 tests where package boundaries permit, or duplicate the data with an explicit cross-reference comment.

### 4. Add pure tests

21. Add the test file under the scripts runner's existing discovery convention.
22. Assert allowed/refused result, stable reason/code, and normalized comparison for every vector.
23. Assert Windows comparisons are case-insensitive only where the runtime is Windows-style.
24. Assert POSIX comparisons preserve case.
25. Assert segment containment, not substring matching.
26. Assert nested cwd inside board worktree refuses.
27. Assert no filesystem/Git access occurs in classifier tests.

### 5. Add disposable Git integration

28. Create a unique OS-temp repository in test setup.
29. Configure local identity and initial branch.
30. Create an initial commit.
31. Create `.worktrees/kanmer` and an ordinary ticket worktree within the disposable fixture.
32. Invoke the real adapter/entry point against the board fixture and assert refusal.
33. Wrap a marker action or marker-file write after the guard; assert it is never reached for refusal.
34. Invoke against the main checkout and ticket worktree; assert allowed behavior and marker execution.
35. Exercise nested cwd and path-with-spaces where supported.
36. Exercise discovery failure and assert safe refusal/expected exit.
37. Capture stdout/stderr/exit for diagnostics.
38. Clean registered worktrees and temp directories in guaranteed teardown.
39. Assert the real Kanmer repo/board paths never appear in fixture paths or command arguments.

### 6. Wire the canonical runner

40. Confirm the existing scripts runner discovers the test automatically.
41. If it uses an explicit list, add the test once in deterministic order.
42. Confirm the root `npm test` or `npm run verify` path invokes that runner.
43. If omitted, wire the existing runner into the shared rail once; do not add a second duplicate call.
44. Keep dependencies unchanged and use the already selected Node test/assertion APIs.

### 7. Verification

45. Run the isolated guard test.
46. Run the complete scripts test runner.
47. Run root `npm test`.
48. Run root `npm run typecheck` if source types changed.
49. Run root `npm run verify` after CORE-031.
50. Run the tests from a normal checkout and from a disposable ordinary ticket worktree.
51. Never run destructive/build assertions from the real board worktree.
52. Inspect generated/working tree state and confirm no marker/build output was created on refused paths.
53. Run `git diff --check`.
54. Record exact test vectors and outputs in the post-implementation report.

## Expected files

- Existing canonical guard module under `scripts/` (only if pure extraction is needed).
- New canonical guard test file under the existing scripts-test convention.
- Existing scripts runner/root package rail only if discovery currently omits the file.
- No product/API documentation change unless implementation reveals a real contract discrepancy.

## Acceptance checks

- Every required path vector has a direct assertion.
- Exact/nested board paths refuse; sibling/prefix-collision and normal ticket worktrees pass.
- Windows and POSIX comparison semantics are correct.
- Discovery failure follows the existing safe behavior.
- Refusal happens before a protected marker/write.
- Disposable real-Git integration passes and cleans up.
- The test is reached by the canonical root verification rail.
- No new framework, retry, sleep, network, or production-board access exists.
- CORE-034 scope remains separate.

## Verification commands

Use the exact scripts discovered in the repository. Evidence must include the equivalent of:

```bash
node scripts/test.mjs
npm test
npm run typecheck
npm run verify
```

Run the specific test directly through the canonical runner where supported.

## Failure and deviation rules

- Stop if the current guard policy conflicts with FRD-022/AGENTS; record the conflict in open questions instead of silently encoding accidental behavior.
- Stop if a test path resolves into the real `.worktrees/kanmer` directory.
- Do not modify `takeTicket`, status health, stages, release semantics, or plugin output.
- Do not add a duplicate guard implementation or test framework.
- Do not weaken a fail-safe discovery error to allow execution.
- Do not merge; hand off to review.

## Stop condition

Stop when the canonical scripts test runner directly proves the existing worktree guard's pure path contract and disposable-Git adapter behavior, refused cases cannot reach a protected write, allowed checkout/ticket cases still work, the root verification rail is green, and no real board files were touched. Do not merge or start the next ticket.
