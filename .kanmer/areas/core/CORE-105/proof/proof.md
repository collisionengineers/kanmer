# Proof — CORE-105

## Verdict

PASS on exact protected squash merge `29e52eea693d597ac9189e77c21074ba8d244b14` (PR #267), reachable from `origin/main`.

## Evidence

Executed in a disposable detached worktree at the merge SHA:

- `npm ci`: exit 0; existing audit summary retained, no dependency changes in this ticket.
- Exact focused test repeated five times: PASS 5/5, measured 770 ms, 565 ms, 579 ms, 604 ms, and 572 ms.
- `npm test -w @kanmer/core`: exit 0; 15 files, 310 tests. The target test completed in 532 ms during the full suite.
- `npm run typecheck`: exit 0 for all workspaces.
- Hosted exact-head post-attestation workflow attempt 2: `kanmer-gate` and `verify` both SUCCESS.

## Claim checked

The only source diff changes this test-local timeout from 15,000 ms to 30,000 ms. Assertions, production code, dependencies, and global test configuration are unchanged. The bound exceeds the preserved 20.789-second hosted Windows observation without making the test unbounded.

## Attempts retained

The post-implementation report retains the initial invalid local harness command that matched no tests. The historical 15-second hosted timeout and subsequent exact-head green runs remain linked through [[CORE-104]] and [[GUI-139]]; later passes do not erase them.
