# GUI-082 plan — stylesheet selector audit

## Governing documents

- `docs/functional/frd/FRD-019-gui-shell.md` — preserve the renderer's global themed shell surfaces.
- [[GUI-072]] — retain its deliberate `.check`/ `.check-row` separation and text-level guard.

## Steps

1. Re-run the selector inventory against the current branch and confirm the audit boundary: dynamic drag/drop and dispatch-state classes are live; checkbox rows remain live and distinct.
2. In `styles.css`, remove only the confirmed unproduced legacy selector blocks: priority badges, stale list/chip styles, retired resize/settings sections, and retired document/profile editor sections.
3. Extend `lib/stylesCheckRule.test.ts` with focused text assertions that the removed selectors stay absent and the three live families (drop edges, dispatch states, checkbox rows) remain present. Keep its explicit limitation: it is not a layout/browser test.
4. Run the focused test, all GUI tests, GUI typecheck, and GUI build. Re-run the source audit and inspect the diff to ensure no markup, theme token, or dynamic selector contract changed.
5. Record report evidence, open a scoped PR, review it independently if a reviewer is available (otherwise perform and record self-review), merge only after a clean review, verify merged main, write proof, and close out the worktree/branch.

## Risks and guardrails

- A literal-only selector scan can misclassify template-generated classes. The audit explicitly checks `drop-${dropEdge}` and typed `DispatchStatus.state` before deletion.
- CSS has no browser-test dependency. Text assertions protect the audit decisions; build/type/test checks protect integration. No visual behavior is intentionally changed.
- Do not collapse `.check-row` into `.check`; its distinct markup and existing regression guard are part of [[GUI-072]]'s completed scope.
