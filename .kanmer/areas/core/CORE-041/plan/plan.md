# Plan — CORE-041: Make project identity smoke drive-neutral on Windows CI

## Approach

Update only `packages/mcp-server/src/smoke.mjs` so its expected result for POSIX-looking roots uses the current Windows drive derived from the native working directory. This matches the existing `canonicalProjectPath` contract, fixes the hosted D: runner failure without assuming a machine-specific drive, and keeps the explicit C:-drive vector and exact fingerprint assertions as regression coverage. Changing production identity code or weakening the assertions would be broader than the observed defect.

## Governing docs

No PRD, FRD, or ADR is linked: this is a narrowly scoped CI/test-rail remediation for the hosted evidence recorded in the ticket, not a change to the remote-access or project-identity product contract. `docs_todo` remains true on the ticket for the board's governing-doc bookkeeping; this plan does not modify governing documentation.

## Steps

1. Derive the active Windows drive from `path.parse(process.cwd()).root` (or an equivalent native-root expression) and use it only for the POSIX-vector expected board and repo paths; retain POSIX expectations unchanged on non-Windows hosts.
2. Keep the explicit Windows `C:\Kanmer\...` canonicalization and `canonicalProjectPath("C:\\")` assertions, and keep the ordered fingerprint assertion based on the derived expected roots.
3. Run the focused standalone smoke, then the relevant server typecheck/build and shared script/smoke rails; record exact exit codes and preserve any unrelated environment failures.
4. Update the ticket checklist and post-implementation report, record the commit, push the dedicated branch, and open a PR for independent review; stop before merge.

## Verification

From the dedicated worktree, run `npm run build:server`, `node packages/mcp-server/src/smoke.mjs`, `npm run typecheck -w @kanmer/mcp-server`, `npm run test:scripts`, and `git diff --check`. The focused smoke must pass its project identity canonicalization and exact fingerprint checks. On merged main, `npm run smoke`/the authoritative verify rail should be rerun on the hosted Windows runner to prove the original D:-drive failure is cleared.

## Risks / open questions

- The local host is Windows but may use a different drive from hosted CI; deriving the native root is intentional and makes the assertion portable.
- No unresolved questions remain.
