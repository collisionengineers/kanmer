# Proof — GUI-105

## Merged-main verification

- PR #128 merged by squash at merge commit 8b3490bcdeacaeed4a95a140356db3465b441831; implementation commit d64000dd1d84138a54ff952ed1c80f18d23c8055 is reachable from main.
- Main checkout: git pull --ff-only origin main — PASS; git status contains only the pre-existing untracked skills-lock.json.
- npm run test -w @kanmer/gui -- src/renderer/src/components/Editor.test.tsx — PASS (15/15).
- Independent review also ran the full GUI suite — PASS (37 files, 348 tests) — workspace typecheck — PASS — and git diff --check — PASS.

## Acceptance evidence

The merged Editor now consumes the shared documentPaths inventory, exposes exact nested/custom paths, preserves path identity through load/save/preview/conflict and dirty-switch flows, and keeps scratch/reference/assets outside the pipeline selector. The focused tests cover named-only, nested duplicate basenames, conventional-index preference, empty creation, exact save, dirty switching, and live inventory refresh.

Manual visual GUI proof was unavailable in the headless environment and is explicitly not claimed.
