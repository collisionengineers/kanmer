# Checklist — GUI-144

- [ ] Worktree `.worktrees/gui-144` on branch `gui-144-project-registry` from origin/main
- [ ] `apps/gui/src/main/projectRegistry.ts`: contract mirror (schema 1, name regex, validation, location precedence)
- [ ] `projectRegistry.ts`: `observeRegistry` with read-only stores, health classification, selected marking (project_id then fingerprint), controllers/workspaces with claim + defensive lease fields
- [ ] `projectRegistry.ts`: serialised writer (queue + stale-edit guard + atomic rename) with upsert/rename/remove/setPolicy
- [ ] `projectRegistry.test.ts`: location, parse/validate matrix, two fixture boards with distinct health, missing/invalid/malformed, concurrent upserts, stale-edit guard, contract check against the server module
- [ ] `shared/ipc.ts` + `preload/index.ts`: five registry channels and view types
- [ ] `main/index.ts`: handlers registered; add uses open `ProjectContext` roots only; name/policy validated at the boundary
- [ ] `ProjectRegistry.tsx` section + Settings "Projects" tab; non-selected endpoints only "Open project"
- [ ] `ProjectRegistry.test.tsx`: two endpoints with distinct health; non-selected has no mutation controls; add/rename/remove call the api
- [ ] Docs: `settings.md` Projects section, `connect.md` sentence, `npm run build:manual` regenerated and committed
- [ ] [pre-review] `npm test -w @kanmer/gui`, `npm run typecheck -w @kanmer/gui`, `npm run check:manual`, `npm run verify:docs`, `npm run build -w @kanmer/gui` with exit codes recorded
- [ ] [pre-review] Post-implementation report written; PR open with `Kanmer: GUI-144` footer; ticket in Review; stop

## Progress notes
