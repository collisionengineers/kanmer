## Independent review — CORE-031 commit 2a0d489e23c4c6ebce46eb2e5e4e85cef7461d03

Disposition: NEEDS CHANGES. No merge performed.

Changes reviewed: the commit adds dependency-free `scripts/verify.mjs` with frozen `VERIFY_STEPS`, root `verify` npm script, and import-safe direct execution; replaces release.mjs's private GATE with the shared array; and documents the shared PR/release rail in AGENTS.md. `git diff --check main...2a0d489` is clean and the diff is scoped to the four planned files.

Blocking findings:

1. The required aggregate rail is not green. `npm run verify` was run at this SHA and exited 1 during `npm test`; the GUI suite failed `src/main/kanmerGit.test.ts > renameBoardBranch > keeps the history, the path and the remote consistent` with a 5-second timeout followed by Windows `EPERM, Permission denied` cleanup for the temp directory. The ticket's own clean-standalone progress note also records `npm run verify` failing at its first step because a fresh checkout has no `packages/core/dist` while GUI tests resolve `@kanmer/core` from its package `dist`; the shared order deliberately runs `npm test` before the required `npm run build`. The acceptance condition is a zero-exit `npm run verify` in a normal standalone checkout, so this is not review-ready. Resolve the clean-checkout precondition without silently changing the mandated nine-step order, or obtain an explicit governing decision that changes the contract.

2. The ticket has no `post-implementation-report`, and its checklist leaves the required standalone `npm run verify`, PR opening, and review-readiness items unchecked. Consequently there is no author evidence/report to reconcile against this diff; the implementation notes explicitly stop at Implementing after the failed rail. This is a process/evidence blocker, not merely a documentation nit.

Additional rail evidence: the import-only check printed the exact nine commands without executing them; `npm pkg get scripts.verify` returned `node scripts/verify.mjs`; `npm run test:scripts` passed 48/48. Root `npm run typecheck` also failed, but only in unchanged baseline files (`packages/ui/src/demo.tsx` and GUI test import of `inspectBoardWorktree`), so I am recording that as an existing rail problem rather than attributing it to this four-file diff.

Verdict: NEEDS CHANGES. Re-review after a clean standalone rail (or documented contract correction), a complete post-implementation report/checklist, and no unclassified baseline failures.

## Re-review — f1c4a6805c1235d40051628a7d7d5c4ff4120c54

Recheck evidence: branch is clean; four-file diff vs main is scoped; `git diff --check` passes; import-only output is the nine-step build-first array; `npm pkg get scripts.verify` is exact; `npm test` passes core 256, GUI 318, HTTP 61, scripts 66; `npm run typecheck` passes all workspaces; `npm run test:scripts` passes 66/66. The report/checklist now contain standalone PASS evidence and the disposable board cleanup claim.

Remaining blocking documentation inconsistency: `plan.md`'s governing-doc/approach and ordered implementation steps now say build-first, but its authoritative `Required changes` item 2 still enumerates the old order beginning with `npm test` and placing `npm run build` third. `open-questions.md` also still marks the old test-first order as the resolved authoritative order. `MASTERPLAN.md` likewise still states test-first for S-01. The implementation/report and `VERIFY_STEPS` correctly use build-first to satisfy the clean-checkout contract, but the governing docs do not agree with the shipped behavior. Update the plan required list/open-questions/MASTERPLAN source or explicitly record the approved amendment before review PASS; do not leave two conflicting canonical orders.

Provisional verdict: NEEDS CHANGES solely for this documentation/contract mismatch. No merge performed.

## Independent review — latest f1c4a680 (HEAD)

NEEDS CHANGES. Implementation behavior is green and independently verified: npm test PASS (core 256, GUI 318, HTTP 61, scripts 66), full typecheck PASS, npm run test:scripts PASS 66/66, import-safe VERIFY_STEPS/root script and diff check pass, and the standalone report records clean npm ci plus npm run verify plus plugin/skills/agents rails. However, the canonical ticket contract is internally inconsistent: scripts/verify.mjs, AGENTS.md, checklist/progress, and report implement/document build-first, while plan.md Required changes item 2 and open-questions.md still declare the old test -> typecheck -> build order (and the governing MASTERPLAN S-01 wording remains stale). Reconcile the governing plan/open-question command order to the shipped build-first rail, then re-review; no code blocker found.
