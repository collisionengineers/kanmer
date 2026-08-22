# Post-implementation report — CORE-049

## Summary

CORE-049 routes stale-lock quarantine renames through the existing bounded `renameWithRetry` contract, preserving the CORE-047 token/lease ownership protocol while retrying Windows `EPERM`, `EBUSY`, and `EACCES` failures. Deterministic coverage exercises each transient code, the regenerated standalone plugin contains the change, and the implementation is committed as `8edfede9bdb663171601cb326a67bd03792065e2` on `core-049-quarantine-rename-retry`, based on merged CORE-047 `0f7ccc4efad0aeae2295f3ba08e0b6e886356679`. PR #171 is open against `core-046-lock-reclaim-race-ipv6` for independent review.

## Changes

| File | Change | Why |
|---|---|---|
| `packages/core/src/io.ts` | Wrap the injected stale quarantine rename seam with `renameWithRetry`. | Apply the existing bounded Windows retry policy to quarantine ownership transitions without creating a parallel helper or weakening race handling. |
| `packages/core/src/io.test.ts` | Add one deterministic regression covering `EPERM`, `EBUSY`, and `EACCES` on quarantine rename. | Prove each transient error retries once, recovers the stale lock, and leaves no lock residue. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Regenerate the committed standalone artifact. | Keep shipped plugin behavior synchronized with the bundled core helper. |
| MCP ticket records | Refresh CORE-046 cumulative report/traceability and CORE-049 report/checklist/scratch through MCP. | Preserve exact child merge and remediation commit lineage without editing board files directly. |

## Governing docs

- `docs/functional/frd/FRD-027-project-declared-sources.md`: no source retrieval, DNS, cache, or network policy changes; inherited bounded/fail-closed behavior remains intact.
- `docs/architecture/adr/ADR-0020-project-declared-source-trust.md`: no authority, dependency, or provider behavior changes; the retry only hardens the existing serialized filesystem transition.
- CORE-046/047 packets: the tokenized ownership, double-sweep release, active-owner quarantine retention, and inherited source/DNS behavior remain unchanged.

## Risks / follow-ups

- The broad `npm run test:http -w @kanmer/mcp-server` rail produced the exact existing readiness timing failure twice: `81/82`, `src/tunnels/readiness.test.mjs:54`, `TUNNEL_READINESS_TIMEOUT`. The isolated unchanged readiness file passed `7/7`; no assertion or unrelated readiness code was changed.
- The first `npm run plugin:build` attempt failed because the ancestor root `node_modules/@kanmer/core` resolved the stale main-checkout artifact and esbuild reported missing exports. An ignored worktree-local package junction restored the intended worktree resolution; the rerun build and plugin parity checks passed. No source or lockfile change was made for setup.
- Live Windows handle contention, crash timing, PID reuse, and process termination between inspection and reclaim remain explicitly INCONCLUSIVE; deterministic retry and ownership tests do not claim those external conditions.

## Verification hand-off

On merged main, run:

- `npm run test -w @kanmer/core -- src/io.test.ts` — expect the 19 IO tests, including all three transient quarantine cases.
- `npm run test -w @kanmer/core` and `npm run typecheck`.
- `node --test packages/mcp-server/src/sources.test.mjs`.
- `npm run build:core`, `npm run build -w @kanmer/mcp-server`, `npm run plugin:build`, and `npm run plugin:check`.
- Re-run the broad MCP HTTP rail and preserve the readiness timing boundary if it recurs; the isolated readiness file should remain `7/7`.
- `git diff --check`.

Traceability: base `core-046-lock-reclaim-race-ipv6` at `0f7ccc4efad0aeae2295f3ba08e0b6e886356679`; implementation `8edfede9bdb663171601cb326a67bd03792065e2`; branch `core-049-quarantine-rename-retry`; worktree `.worktrees/core-049`; PR #171 (open).
