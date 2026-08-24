# Research — CORE-095

## Question

Why did the protected Windows verification of current `origin/main` time out in three otherwise passing core filesystem tests, and what is the narrowest deterministic fix that preserves their semantic and bounded-time assertions?

## Evidence

The protected `windows-latest` run in CORE-035’s disposable repository reached the product verification rail after the fixture's canonical-origin setup. Core results were 307 passing tests and three 5-second test timeouts:

- `packages/core/src/io.test.ts` — `withExclusiveFileLock` stale-dead-owner recovery;
- `packages/core/src/docs.test.ts` — area-default versus explicit ticket-profile resolution;
- `packages/core/src/store.test.ts` — area-based ID allocation and folder placement.

The failure occurred before the fixture's protected-branch/merge evidence could become a passing result. It is source-test execution evidence, not a reason to alter CORE-035’s protection rules or its canonical-origin fixture setup.

At current `origin/main` (`9a75bd690a80bf070bb8ddc372b3a95fa03ec789` when inspected):

- `packages/core/package.json` runs `vitest run` with no execution-isolation override.
- The installed Vitest CLI documents a 5,000 ms default test timeout and file parallelism enabled by default; it supports `--no-file-parallelism`.
- The three affected suites use independent `fs.mkdtemp(os.tmpdir(), ...)` roots and recursive cleanup, but each performs real filesystem creation, rename/link/lock, frontmatter, and directory operations. The IO case also exercises the bounded stale-lock reclaim path.
- The tests did not report a changed expected value, uncaught implementation error, or shared logical fixture collision. The pattern is consistent with concurrent Windows filesystem scheduling/cleanup pressure across Vitest files, but this planning evidence does not claim a lower-level Windows cause that has not been independently reproduced.
- CORE-022 records a distinct real Windows `EPERM` history in these same filesystem layers. Its later verification records the same classes of core timeout/cleanup failures under a Windows run. That supports isolating test execution, not changing lock semantics, retry bounds, profile rules, or ID behavior.

## Decision

Make the core test runner serialise **test files only** by adding Vitest's supported `--no-file-parallelism` option to the core test commands. Vitest tests inside each file retain their existing semantics and timeout bounds.

This is a package-scoped execution-isolation policy, not a global timeout increase or an assertion change. It removes cross-file filesystem competition while retaining the current finite 5-second bound for every individual test. No timeout adjustment is planned.

## Constraints

- Do not weaken, remove, skip, retry, or change the three assertions.
- Do not change `withExclusiveFileLock`, stale-lock recovery, profile-gate resolution, ID allocation, or production runtime behavior unless new execution evidence identifies a semantic defect.
- Do not set a global timeout, use retries to hide flakes, or relax the fixture's protected branch/rules.
- Do not touch the CORE-035 fixture until a reviewed CORE-095 implementation is available.
- Preserve both successful and failed evidence in their respective tickets.

## Governing-doc assessment

FRD-006 requires truthful, typed proof gathered on merged main. It supports retaining the failed protected-run result and requiring a fresh exact-head pass; it does not require a new FRD/ADR for this test-runner isolation change. The existing `AGENTS.md` command/convention rule does require its maintenance guidance to be updated with the package-scoped policy.
