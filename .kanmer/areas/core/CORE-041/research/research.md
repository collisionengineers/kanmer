# Research — CORE-041: project identity smoke drive neutrality

## Question
Why does the project-identity smoke fail on hosted Windows CI, and what is the smallest test-only correction that preserves canonical path and fingerprint coverage across host drives?

## Findings

- `packages/mcp-server/src/smoke.mjs` constructs POSIX-looking vectors (`/srv/kanmer-board/` and `/srv/kanmer-repo///`) and currently hardcodes `c:/srv/...` as the Windows expected value.
  - The same file already asserts explicit Windows vectors (`C:\Kanmer\Board\` and `C:\Kanmer\Repo\`) remain lowercase-drive, case-preserving canonical paths, and that `canonicalProjectPath("C:\\")` is `c:/`.
- `packages/mcp-server/src/project-identity.ts` resolves non-Windows-absolute inputs with the host-native `path.resolve`, then normalizes separators, lowercases only the drive letter, and removes trailing separators.
  - On Windows, resolving `/srv/kanmer-board/` therefore uses the runner's current drive; it is not a fixed `C:` contract.
- Hosted PR #145 run 32544292566 reached `npm run smoke` after 80/80 script tests passed. `smoke.mjs` failed the project identity canonicalization check and its exact fingerprint check because the runner returned `d:/srv/kanmer-board` and `d:/srv/kanmer-repo` while the smoke expected `c:/...`.
  - The failure is an environment-drive mismatch in the smoke expectation; the production canonicalization and fingerprint assertions are the behavior under test.
- `path` is already imported by `smoke.mjs`, so the test can derive the active Windows drive from the native working-directory root without a dependency or production-code change.

## Implications

The smoke expectation must derive the Windows drive from the test host (for example, the root parsed from `process.cwd()`), then compose the expected POSIX-vector paths from that drive. The explicit `C:\Kanmer\...` vectors and the fingerprint payload must remain unchanged in meaning. No production source, workflow, dependency, or release artifact change is justified.

## Open questions

- None. The hosted failure identifies the defect and the requested scope explicitly requires a test-only drive-neutral expectation.
