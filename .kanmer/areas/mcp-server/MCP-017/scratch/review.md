# Independent review — 2026-08-21

## Changes

- `scripts/lib/plugin-checkout-guard.mjs`: adds the dependency-free pure `ownsCoreResolution` predicate. It normalizes the selected platform's separators/case, resolves both paths, and requires strict child containment.
- `scripts/check-plugin-sync.mjs`: invokes the predicate at the existing ownership preflight before source, bundle, manifest, or handshake validation. The refusal text and exit code remain unchanged.
- `scripts/plugin-checkout-guard.test.mjs`: adds Node built-in coverage for local ownership, main-checkout leakage from a ticket worktree, prefix collision, package-directory strictness, Windows normalization/case, and POSIX case sensitivity.

## Comments and dispositions

- **Blocking:** none. The helper is dependency-free, has no Git/filesystem side effects, fails closed for external/prefix/parent/same-directory paths, and production invocation remains before guarded validation.
- **Non-blocking bookkeeping:** the post-implementation report's Traceability section still says `PR: pending creation`, while PR #105 is open and is recorded in the item and `scratch/execute.md`. **Disposition:** retain as a verification/closeout documentation correction; it does not alter the reviewed diff or merge safety, and the exact PR/merge SHA must be recorded before Done.
- **Non-blocking timing:** the ticket body verification bullets and final checklist line remain open because merged-main proof and closeout are intentionally subsequent stages. **Disposition:** expected workflow state; verify and close out rather than pre-ticking.

## Checks

- `node --test scripts/plugin-checkout-guard.test.mjs`: PASS, 5/5.
- `npm run test:scripts`: PASS, 71/71.
- Linked-ticket-worktree `npm run plugin:check`: PASS-as-refusal, exit 1 with the preserved ownership diagnostic.
- Normal main-checkout `npm run plugin:check`: PASS, 30 tools, byte parity, manifests, isolated handshake.
- `git diff --check origin/main...dd9f736`: PASS.
- Additional adversarial path vectors (different Windows drive, parent/prefix escape, mixed separators): PASS.
- PR #105 is OPEN, non-draft, MERGEABLE, with no review findings or CI checks reported.

## Verdict

PASS. Independent reviewer is not the author. PR #105 is approved for merge; hand off to merged-main verification.
