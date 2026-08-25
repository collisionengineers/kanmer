# Files — CORE-102

## Where the change lands

| Path | Why |
|---|---|
| `packages/core/src/store.test.ts` | Primary test surface. The target case currently performs a board-area mutation before proving area-prefix ID allocation and both persisted ticket paths. A later implementation must retain those ID/path assertions and make any fixture separation explicit. |
| `packages/core/src/io.ts` | Read-only diagnostic context and potential source surface only if planning proves a concurrency-safe fix. `defaultProcessIdentity` synchronously invokes Windows PowerShell on the cold `withExclusiveFileLock` path; its owner/PID-reuse role makes it high risk. |
| `packages/core/src/io.test.ts` | Required regression context if `io.ts` is proposed: it already proves bounded lock retries, stale-owner recovery, and cleanup. Any identity-path change needs equivalent safety coverage rather than a timing-only pass. |
| `packages/core/src/store.ts` | Read-only call-path context: `addColumn → setBoard → withExclusiveFileLock`; it also owns `createItem`, the actual area-prefix/folder behaviour the target must keep proving. |
| `packages/core/package.json` | Read-only guardrail. It already uses `--no-file-parallelism`; CORE-102 must not reintroduce a broad runner change or compensate with timeout/retry flags. |
| `packages/core/src/board.ts` | Test-fixture context. A fresh board already declares the `pr-review` area with prefix `PR`, which may allow a test to exercise area-prefix allocation without making an unrelated first lock mutation. This is an option to assess, not an approved edit. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `packages/core/src/store.test.ts` | The test uses a unique temporary root per case and directly asserts `API-001`/area path plus unassigned `TICK-001`/fallback path. Preserve the behavioural claim; do not replace it with an in-memory or mocked store. |
| `packages/core/src/store.ts` | `addColumn` is not a no-op setup helper: it serialises whole-board writes with the cross-process lock. `createItem` separately derives the area prefix, scans existing IDs, exclusively creates a ticket file, updates counters, and records activity. |
| `packages/core/src/io.ts` | The Windows process identity lookup is synchronous and cached; identity records protect lock reclamation against PID reuse. Lock retry and rename retry bounds are production safety behaviour, not a test-flake knob. |
| `packages/core/src/ids.ts` | `nextPrefixNumber` scans area folders and combines on-disk and counter values; it is the allocation mechanism that area-ID testing must continue to exercise. |
| `packages/core/src/board.ts` | Default-board `pr-review/PR` setup and `areaPrefix` rules distinguish area-prefix allocation from custom-area board mutation. |
| `packages/core/src/paths.ts` | `ticketFileIn`/area-folder rules define the persisted path contract asserted by the test. |
| `packages/core/package.json` | Confirms current serial file scheduling, so no plan may attribute the current failure solely to parallel Vitest files. |
| `scripts/verify.mjs` | The authoritative release/PR rail executes root `npm test`, which reaches the core package command; no new verification pyramid is needed. |
| `.github/workflows/release.yml` | Tag-push workflow context only. It must remain unchanged; the historical `v0.3.7` run is evidence, not a remediation target. |
| `docs/functional/frd/FRD-015-ticket-and-board-core.md` | Governing ticket/board contract referenced by CORE-102. Any fixture refactor must still prove the documented area-based storage behaviour. |
| `.kanmer/areas/core/CORE-095/*` (board context) | Earlier serial-file remediation preserved the 5-second per-test bound; its recorded limits prevent repeating an insufficient scheduler-only change. |
| [Release verification run 32792361526](https://github.com/collisionengineers/kanmer/actions/runs/32792361526) | Immutable external failure evidence: 309 core passes and one timeout. It has no per-await trace and must not be rerun/repaired under this ticket. |

## Ripple effects

- The focused core test and the normal `npm run verify` rail must demonstrate the unchanged area-prefix and path claim.
- If a runtime lock change is proposed, lock-recovery tests and cross-process semantics become in-scope and the change needs a separate safety rationale; a test-only refactor avoids that production surface.
- A source/test change requires the normal independent review and fresh hosted verification. It does not authorize release, tag, asset, or workflow activity.
- CORE-101 remains blocked until this remediation is independently merged and verified; only factual follow-up evidence may then be appended.

## Out of scope

- Any v0.3.4–v0.3.7 tag, GitHub Release, asset, `latest.yml`, publisher, or workflow mutation.
- Rerunning, cancelling, repairing, or otherwise changing historical tag-workflow run 32792361526.
- Increasing test/hook timeouts, adding test retries, skipping assertions, or changing the existing serial file policy.
- Unrelated production store, board, ID, GUI, MCP, plugin, or documentation work.
- A broad redesign of lock identity/recovery; it is parked unless a later approved plan establishes a concurrency-safe, separately proven need.
