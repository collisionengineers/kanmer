# Research — CORE-102: Windows area-ID test timeout

## Question

Why did the v0.3.7 tag workflow time out the area-based ticket-ID test despite CORE-095's serial-core policy, and what constraint must a later remediation respect without relaxing the test claim or its timeout?

## Findings

- **Observed hosted failure:** [Release verification run 32792361526](https://github.com/collisionengineers/kanmer/actions/runs/32792361526) ran the Windows tag-push rail for `v0.3.7` at `e1f8f148c59093ba6fe259777067d4723ebecb5e`. Its `npm test` step recorded 309 passing core tests and one timeout: `KanmerStore > gives tickets area-based ids and places them in the area's folder` in `packages/core/src/store.test.ts`; Vitest's 5,000 ms limit fired and the case completed at 8,185 ms. This is retained historical evidence; no release workflow was rerun.
- **Current runner is already serial at file level:** current `origin/main` is the same merge SHA and `packages/core/package.json` runs `vitest run --no-file-parallelism`. CORE-095 introduced that setting after earlier Windows filesystem timeouts. Therefore cross-file parallelism is not sufficient to explain this later failure.
- **The target test conflates two behaviours:** `store.test.ts:65–81` first calls `store.addColumn("area", { id: "api", name: "API" })`, then verifies area-prefix allocation and both persisted paths. Its behavioural claim is the latter: `API-001` in `areas/api/` and `TICK-001` in `areas/_none/`.
- **The first board mutation has an unrelated synchronous external dependency:** `store.ts:313–321` implements `addColumn` through `setBoard`; `setBoard` enters `withExclusiveFileLock`. On Windows, `io.ts:92–129` obtains the caller's process-start identity by synchronous `execFileSync("powershell.exe", … Get-Process … StartTime …)` before claiming that lock. The value is then cached per Node process. The identity is part of the lock's PID-reuse protection, not area-ID allocation.
- **Local timing isolates that boundary:** against an exact clean clone of current `origin/main`, a direct measurement of the test's operations recorded first `addColumn` at **459.9 ms**, followed by cached `addColumn` calls at **11.7–15.5 ms**; `createItem` calls were **8.5–15.6 ms**. A focused unchanged-timeout Vitest run reported the target test itself at **493 ms**. Twelve fresh focused Vitest invocations all passed; their end-to-end process durations were 7.36–8.32 s, which includes Vitest/npm startup and is not the test timeout clock.
- **No shared fixture collision is evidenced:** the test's `beforeEach` creates a unique `fs.mkdtemp(os.tmpdir(), "kanmer-test-")` root and removes it afterwards. The tag-run log records a timeout, not an `EEXIST`, assertion mismatch, or filesystem exception. It also contains no per-await timing trace, so it cannot directly name the slow await.
- **The timing interpretation is deliberately limited:** the measured cold-versus-cached lock difference and the source call graph make a slow cold PowerShell identity lookup the strongest explanation for the hosted 8,185 ms wall time, especially under a Windows runner's load. The hosted log does not prove that cause by itself; temporary-directory scanning, antivirus/indexing delay, or other runner scheduling could have contributed.
- **Lock identity semantics are protected context:** the Windows identity branch was introduced in commit `388a1b284` for lock ownership/PID-reuse safety. `withExclusiveFileLock` also has bounded contention retries; changing those semantics to make a test faster would be a separate concurrency-safety decision, not an implicit test-only change.
- **CORE-095 is useful but not dispositive:** it proved a clean Windows full rail after disabling file parallelism, while explicitly retaining individual finite test bounds. This failure shows that serial file scheduling did not remove every cold-process/Windows timing source.

## Implications

- Do not increase the test timeout, add retries, weaken path/ID assertions, or modify release history/workflows.
- A remediation should keep the test focused on area-prefix allocation and persisted placement, and must not silently turn a lock-ownership regression into a pass.
- Planning must decide whether the narrow fix is test-fixture separation from the unrelated first lock acquisition, a lock-identity implementation change with its own safety proof, or a combination. The current evidence supports neither an assertion change nor a blanket scheduler/timeout change.
- Any implementation must preserve the distinction between evidence and inference above and obtain a fresh PR/merged-main rail; historical run 32792361526 remains failed evidence.

## Open questions

- The exact hosted per-await latency is not observable from the retained workflow log. A future implementation may add only a focused, non-secret test demonstration where needed; it must not alter the historical workflow or fabricate a root-cause measurement.
- Whether a lock-identity optimisation can retain dead-owner/PID-reuse guarantees requires separate design validation before touching `io.ts`; see the explicitly deferred question document.
