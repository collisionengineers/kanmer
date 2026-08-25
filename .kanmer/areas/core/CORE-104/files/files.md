# Files — CORE-104

| File | Change |
|---|---|
| `packages/core/src/store.test.ts` | Add a test-local bounded timeout to the filesystem-heavy area-validation integration test. |

Context: `.github/workflows/pr.yml` invokes the authoritative Windows rail. Production core code, assertions, and global Vitest policy are out of scope.
