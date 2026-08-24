## 2026-08-24 dry-run refusal

- Clean clone at origin/main ef67c04e0f3a20145dcb88497fdcb97a53038ab6: `npm ci --ignore-scripts` exited 0.
- `npm run release -- 0.3.4 --ticket CORE-096 --dry-run` exited 1 before the shared verification gate.
- Exact refusal: `apps/gui/release-notes.md` does not mention 0.3.4. No release branch, tag, GitHub release, public asset, or source edit was created.
- This is an intentional release-script guard. The plan/file map/checklist must be revised to include an accurate v0.3.4 release-notes update before retrying.
