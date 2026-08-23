Checks: focused GUI tests `npx vitest run src/renderer/src/lib/views.test.ts src/renderer/src/lib/board.test.ts` passed 38/38. Full GUI `npm test` ran but retained unrelated baseline failures: dispatch.test assertion mismatch (`requires a named task` vs antigravity unsupported), and collection failures in connect.test.ts, providers.test.ts, index.sync.test.ts, skillsVersion.test.ts. GUI typecheck failed on existing core/provider integration (`dispatchDeliverableProven`, `verifyDeliverable`, `withExclusiveFileLock`, antigravity type). GUI build failed because `withExclusiveFileLock` is not exported by the resolved @kanmer/core dist. These are outside GUI-125 files and remain INCONCLUSIVE.

Implementation committed on `gui-125-remove-priority-filter`: 97573a10901a74af4f7d1e2e98cd674e14b07efd. Only `FilterBar.tsx` changed (two deletions); diff check passed. `defaultPriority` source paths remain unchanged.

Opened PR https://github.com/collisionengineers/kanmer/pull/228 from `gui-125-remove-priority-filter`; commit 97573a10901a74af4f7d1e2e98cd674e14b07efd recorded on the ticket.

MCP move completed implementing → review after get_doc_gates confirmed gates. PR #228 checks were still IN_PROGRESS at hand-off; no merge or review performed.
