# Post-implementation report — CORE-041

## Summary
The project-identity stdio smoke now derives the active Windows drive for POSIX-looking path vectors instead of assuming `c:`. This clears the hosted Windows D:-drive mismatch while preserving the strict explicit Windows canonical-path vectors and exact ordered fingerprint assertion.

## Changes

| File | Change | Why |
|---|---|---|
| `packages/mcp-server/src/smoke.mjs` | Modified the smoke expectation to derive `path.parse(process.cwd()).root`, normalize the drive, and compose the POSIX-vector expected paths. | Windows native resolution maps `/srv/...` to the runner's current drive; the old fixed `c:` expectation failed on hosted D:. |

## Governing docs

No PRD, FRD, or ADR is linked. This is a test-only CI remediation and does not modify the project identity or remote-access product contract. The ticket's `docs_todo` flag remains the board's explicit governing-document disposition.

## Risks / follow-ups

- The local and hosted Windows runners may use different drives; deriving the native root is intentional and makes the smoke portable.
- The explicit `C:\Kanmer\...` vectors and `canonicalProjectPath("C:\\") === "c:/"` assertion remain unchanged, so drive normalization and case-preservation coverage is retained.
- The original hosted failure remains an exact external verification follow-up: PR #145 run 32544292566 failed the project identity smoke because it returned `d:/srv/...` while the test expected `c:/srv/...`; this branch fixes that expectation only.

## Verification hand-off

On merged `main`, rerun the authoritative verify rail on the hosted Windows runner and confirm `npm run smoke` reaches 224/224 (or the current smoke count) with both project identity checks passing. Local evidence on commit `88ec6307`:

- `npm run build:server` — exit 0.
- `node packages/mcp-server/src/smoke.mjs` — exit 0, 224/224 checks passed.
- `npm run typecheck -w @kanmer/mcp-server` — exit 0.
- `npm run build:core` followed by `npm run test:scripts` — exit 0, 80/80 tests passed.
- `git diff --check` — exit 0.
- The first fresh-worktree `npm run test:scripts` attempt exited 1 (78/80) because core dist was absent; the setup failure is preserved in checklist/scratch and was cleared by the documented core build.
