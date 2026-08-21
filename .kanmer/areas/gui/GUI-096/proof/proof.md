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

## Current merged-main reconciliation — 2026-08-21

The current merged main is d9379d32 (with GUI-096 merge 6dec9c5af9731b74849115d77305bcb443b12dd1 reachable). Reconciliation checks: focused Editor test 10/10; core docs test 50/50; full GUI suite 37 files / 338 tests; all-workspace typecheck exit 0; GUI production build exit 0; and git diff --check exit 0.

The current shared npm run verify rail was attempted twice. First run reached the HTTP suite with 60/61 passing and failed readiness accepts only a bounded successful loopback /ready response with TUNNEL_READINESS_TIMEOUT. The exact npm run test:http -w @kanmer/mcp-server rerun retained the first failure and additionally hit project resolution fails before binding and leaves no listener with spawnSync ... ETIMEDOUT, finishing 59/61. These are unrelated HTTP test-environment failures; no GUI-096 test failure is claimed, and no overall verify PASS is claimed.

The five stale checklist items were reconciled from the merged code paths and existing tests: valid scratch selection is non-writing, invalid/duplicate validation is local, versioned dirty/conflict handling is preserved, and first-group context reload/state/render paths remain explicit. Interactive screenshots remain unavailable in this Windows session; no screenshot evidence is claimed. This was a board/document reconciliation only; no new PR or code change was made.

## Independent review and verification — 2026-08-21

- Root independent review PASS recorded in scratch/review.md; no blocking findings.
- Reconfirmed PR #91 merged on main at 6dec9c5af9731b74849115d77305bcb443b12dd1.
- On current main d9379d32, npm test -w @kanmer/gui exited 0: 37 files / 338 tests passed, including Editor 10/10.
- The retained HTTP verify-rail failures and unavailable screenshots remain explicitly unclaimed.
