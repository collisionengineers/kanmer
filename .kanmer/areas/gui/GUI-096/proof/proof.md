# Proof — GUI-096

## Merged artifact

- PR: [#91](https://github.com/collisionengineers/kanmer/pull/91)
- State: **MERGED** at 2026-08-20T23:32:44Z
- Merge commit on `main`: `6dec9c5af9731b74849115d77305bcb443b12dd1`
- Feature commits: `c438c30`, `b6ad3da392b4f79d80d8286f12d3d3478fb9e53d`

Verification ran from a detached checkout of the exact merged commit, not the feature branch.

## Scope and automated evidence

```text
git diff --name-only 6dec9c5^ 6dec9c5
apps/gui/src/renderer/src/components/Editor.test.tsx
apps/gui/src/renderer/src/components/Editor.tsx
apps/gui/src/renderer/src/styles.css
packages/core/src/docs.test.ts
packages/core/src/store.ts
packages/core/src/types.ts
```

| Command | Result |
|---|---|
| `npm test --workspace @kanmer/core -- docs.test.ts` | Exit 0 — 1 file, 50/50 tests passed. |
| `npm test --workspace @kanmer/gui -- --reporter=dot` | Exit 0 — 30 files, 300/300 tests passed; includes Editor scratch/context coverage (4/4). |
| `npm run typecheck --workspace @kanmer/core` | Exit 0. |
| `npm run typecheck --workspace @kanmer/gui` | Exit 0. |
| `npm run build --workspace @kanmer/gui` | Exit 0 — Electron Vite production build completed. |
| `git diff --check 6dec9c5^ 6dec9c5` | Exit 0 — no whitespace errors. |

## Preserved evidence limitations

- `npm run verify` was attempted on the merged checkout and exits **1** with `Missing script: "verify"`. This is the documented CORE-031 dependency, not a pass.
- Interactive Scratch/context screenshots remain unavailable in this Windows session; no screenshot evidence is claimed.
- The five existing unchecked checklist items remain intentionally unchecked: expanded new-note/invalid-input coverage, dirty/conflict protection coverage, first-group state/wiki/reload coverage, the root verification rail, and screenshot attachment. The focused tests and re-review remediation are evidence for their stated cases only.

## Conclusion

The merged GUI-096 artifact preserves scratch as gate-exempt/outside pipeline tabs, reuses existing document/group operations without a new IPC/view, and renders only the first group context above the ticket body. All available automated merged-main evidence passes; the unavailable and unchecked evidence remains explicitly deferred rather than misrepresented.
