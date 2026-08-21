# Proof — GUI-081

Verified on merged `main` at `2ab18caddef64a03d33270fc9b34ea42da387f88`, the merge commit for PR #97.

## Shipped governing-document state

- FRD-024 R4 now explicitly withdraws contextual manual-help controls.
- It correctly distinguishes GUI-074’s removed Settings-tab `?` from GUI-081’s gate-block `?`, which was never built and is withdrawn rather than described as removed.
- The manual’s actual F1/Help-menu path and GUI-087’s human-facing gate guidance remain documented.
- The gate-block `?` acceptance criterion is absent; FRD-024 acceptance criteria are sequentially numbered 1–4.

## Commands and results

- `git merge-base --is-ancestor 2ab18caddef64a03d33270fc9b34ea42da387f88 HEAD` — exit 0; verification checkout contains PR #97.
- `npm run check:manual` — manual artifact current (19 chapters).
- `npm test -w @kanmer/gui -- gateError.test.ts` — 4 tests passed, 0 failed.
- Targeted stale-claim search for the old gate-block requirement — no matches.
- Targeted R4 assertions find `never built`, `withdrawn by GUI-081`, and F1/Help manual access.
- `git diff --check` — clean.

No visual or runtime behaviour changed; this proof validates the merged governing-document correction.

PR #97: https://github.com/collisionengineers/kanmer/pull/97 — merged 2026-08-21 at `2ab18caddef64a03d33270fc9b34ea42da387f88`.
