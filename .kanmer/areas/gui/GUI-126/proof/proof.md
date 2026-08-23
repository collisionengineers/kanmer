---
kind: proof
ticket: "GUI-126"
merged_commit: 694558dd1625456419aa25eb11c1fe4937cebc10
pr: "229"
verified_on: main
---

# GUI-126 verification

Verified on merged `origin/main` at `694558dd1625456419aa25eb11c1fe4937cebc10`.

- `npm ci` — PASS (clean detached merged-main worktree).
- `npx vitest run apps/gui/src/renderer/src/components/ContextMenu.test.tsx` — PASS, 3/3.
- `npx vitest run apps/gui/src/renderer/src` — PASS, 28 files / 207 tests.
- `npx tsc --noEmit -p apps/gui/tsconfig.web.json` — PASS.
- `git show --check HEAD` — PASS.
- Recorded commit `c950973c4c039a56ea02f68cf7ed7474e224fe18` is reachable from merged main.

The merged behavior returns focus to the parent item when ArrowLeft closes a submenu; root Escape and click-away dismissal remain whole-menu behaviors. The PR verification run `32613689258` passed both `kanmer-gate` and `verify` on the exact reviewed head.

The broader workspace typecheck/build reported by implementation was not used as a pass claim because it remains INCONCLUSIVE on unrelated provider/core integration errors; renderer-only typecheck and the authoritative hosted rail passed.
