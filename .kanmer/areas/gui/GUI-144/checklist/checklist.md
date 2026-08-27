# Checklist — GUI-144

- [x] Worktree `.worktrees/gui-144` on branch `gui-144-project-registry` from origin/main
- [x] `apps/gui/src/main/projectRegistry.ts`: contract mirror (schema 1, name regex, validation, location precedence)
- [x] `projectRegistry.ts`: `observeRegistry` with read-only stores, health classification, selected marking (project_id then fingerprint), controllers/workspaces with claim + defensive lease fields
- [x] `projectRegistry.ts`: serialised writer (queue + stale-edit guard + atomic rename) with upsert/rename/remove/setPolicy
- [x] `projectRegistry.test.ts`: location, parse/validate matrix, two fixture boards with distinct health, missing/invalid/malformed, concurrent upserts, stale-edit guard, contract check against the server module
- [x] `shared/ipc.ts` + `preload/index.ts`: five registry channels and view types
- [x] `main/index.ts`: handlers registered; add uses open `ProjectContext` roots only; name/policy validated at the boundary
- [x] `ProjectRegistry.tsx` section + Settings "Projects" tab; non-selected endpoints only "Open project"
- [x] `ProjectRegistry.test.tsx`: two endpoints with distinct health; non-selected has no mutation controls; add/rename/remove call the api
- [x] Docs: `settings.md` Projects section, `connect.md` sentence, `npm run build:manual` regenerated and committed
- [x] [pre-review] `npm test -w @kanmer/gui` 0 (52 files), `npm run typecheck -w @kanmer/gui` 0, `npm run check:manual` 0, `npm run verify:docs` 0, `npm run build -w @kanmer/gui` 0
- [x] [pre-review] Post-implementation report written; PR #294 open with `Kanmer: GUI-144` footer; ticket moved to Review; stop

## Progress notes

- 2026-08-27 head a9033ec2, PR https://github.com/collisionengineers/kanmer/pull/294. Deviation: GUI mirrors the registry contract (no typed server import available); contract test proves parity.
