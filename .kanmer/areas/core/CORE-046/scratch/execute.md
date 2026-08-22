## CORE-046 execution evidence

- Taken through MCP as codex-core046-execute on branch core-046-lock-reclaim-race-ipv6 / worktree .worktrees/core-046, stacked on CORE-045 1234264b.
- First focused IO run: npm run test -w @kanmer/core -- src/io.test.ts exited 1 because the new deterministic race test timed out at Vitest's 5000 ms limit; the barrier was corrected and the rerun exited 0 with 16/16.
- First standalone server build exited 1 because this worktree resolved the stale root @kanmer/core artifact without the current exports; an ignored local worktree junction to packages/core restored the intended package resolution and the rerun exited 0. No source or lockfile change was made for that environment setup.
- Current source evidence: core 294/294, IO 16/16, MCP source 14/14, MCP HTTP 82/82, scripts 88/88, protocol 46/46, discovery 13/13; core/server/all-workspace typechecks, core/server builds, plugin build/check, docs, skills, agent block, and diff-check all exit 0.
- F-003 is implemented with same-directory atomic stale-inode quarantine/rename and a deterministic two-reclaimer test. F-009 covers 64:ff9b:1::/48, 100:0:0:1::/64, 5f00::/16, 192.175.48.0/24, mapped/special-use inherited ranges, and per-redirect/per-linked-hop DNS lookup evidence.
- Live DNS rebinding, PID reuse, and exact process-crash timing remain explicitly INCONCLUSIVE; no external proof is fabricated.

Opened PR #167 at https://github.com/collisionengineers/kanmer/pull/167 with head 54651a3c77b8ca8d02d9d309e36baf9b62ebca3c; waiting at Review for independent review.

Cumulative traceability refreshed after CORE-049 PR creation: PR #171 is open at `8edfede9bdb663171601cb326a67bd03792065e2`, based on merged CORE-047 cumulative head `0f7ccc4efad0aeae2295f3ba08e0b6e886356679`. Parent `commits[]` remains reachable merged commits only; PR #171 is recorded separately until merge.
