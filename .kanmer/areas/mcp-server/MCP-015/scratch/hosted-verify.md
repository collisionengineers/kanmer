### 2026-08-22 hosted verify failure preserved

Exact hosted evidence from verify run 32549912338/job 96974849841: the authoritative npm test reached the GUI suite and reported three failures, all from legacy Antigravity disconnect fixtures invoking disconnectAgent("antigravity", root) without a command-runner seam. Each failure was AssertionError: expected false to be true // Object.is equality, with Expected true and Received false, at apps/gui/src/main/connect.test.ts lines 159, 308, and 503. The exact test names were:

- registration ownership (GUI-079) > a Claude-only .mcp.json no longer makes grok count as a connected host
- disconnect peer safety > retains the shared block when another copy-skills host has malformed registration
- disconnect and provider-specific project skill directories > removes Antigravity's copy without touching OpenCode's copy

Hosted totals were Test Files 1 failed | 38 passed (39), Tests 3 failed | 358 passed (361). The runner had no agy executable, so the native plugin list command returned ok:false before legacy cleanup. This was a fixture portability failure, not a weakened assertion or a product fallback. Remediation uses the existing ConnectCommandRunner seam with an explicit No imported plugins. response; production still fails closed when agy is unavailable.

### 2026-08-22 bounded hosted-failure remediation

Commit 16f91003 changes only apps/gui/src/main/connect.test.ts. The three legacy Antigravity disconnect fixtures now inject the existing ConnectCommandRunner seam and model the supported absent-plugin output No imported plugins. This preserves the production fail-closed behavior when agy is unavailable and does not weaken any assertion.

Rerun evidence: focused connect.test.ts passed 29/29; standard full GUI run by itself passed 38 files and 356 tests; serialized full GUI with --no-file-parallelism passed 38 files and 356 tests; all-workspace typecheck passed. The earlier hosted failure remains recorded verbatim in scratch/hosted-verify and the post-implementation report. PR #152 is now at head 16f91003 and awaits hosted verify rerun.
