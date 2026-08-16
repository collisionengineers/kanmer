# Checklist — GUI-080

*Derived from plan.md, one box per step.*

- [ ] `providers.ts`: add `formatSkillsStamp` / `parseSkillsStamp` (version line 1, roster below; legacy bare version → `roster: null`) beside `isNewerVersion`
- [ ] `providers.ts`: add `RETIRED_SKILL_PATHS` — the closed two-entry tombstone list, with the comment saying it never grows and why
- [ ] `connect.ts`: add exported `reconcileSkills(destination, bundledSkillsRoot, version)` returning `{ installed, replaced, removed }`
- [ ] `reconcileSkills`: prune roster-recorded folders absent from the new bundle; fall back to bundled names when the stamp has no roster; keep the path-escape guard
- [ ] `reconcileSkills`: apply the tombstone list (folder and intra-folder file)
- [ ] `reconcileSkills`: replace each owned folder wholesale (`rm` then `cp`), then write the new stamp last
- [ ] `installSkills`: call `reconcileSkills` and report replaced folders by name ("local edits discarded"), removed retired folders by name, and installed-not-replaced on a first install
- [ ] `removeBundledSkillsOnly`: read the recorded roster, fall back to `readdir(bundledSkillsRoot)`, apply tombstones; rewrite the doc comment that equates "owns" with "currently ships"
- [ ] `disconnectAgent`: guard the skills removal with a directory-scoped peer check (optional `skillsDir` filter on `hasRegisteredCopySkillsPeer`), leaving the AGENTS-block call's broad semantics unchanged
- [ ] `skillsStatus`: read the version via `parseSkillsStamp` instead of trimming the whole file; `SkillsStatus` shape unchanged (no IPC ripple)
- [ ] `updateSkills`: comment noting it inherits the reconcile through `installSkills`
- [ ] `providers.test.ts`: stamp round-trip, legacy bare version, blank, corrupt, CRLF
- [ ] `connect.test.ts`: retired roster folder pruned while a foreign folder and loose file survive byte for byte
- [ ] `connect.test.ts`: stale file inside a surviving owned folder is gone after reconcile (the `impact-template.md` shape)
- [ ] `connect.test.ts`: a rosterless (legacy) stamp deletes nothing it cannot account for
- [ ] `connect.test.ts`: tombstoned `kanmer-import` removed from a pre-roster install
- [ ] `connect.test.ts`: `removeBundledSkillsOnly` removes a roster-recorded skill the current bundle no longer has; existing foreign-skill test still green untouched
- [ ] `connect.test.ts`: disconnecting opencode retains `.agents/skills` while antigravity is registered, and removes it when only grok is
- [ ] FRD-012: amend R2 (roster + reconcile-not-overlay + closed tombstone list) and R4 (roster + peer clause); add the acceptance criterion
- [ ] Demonstration run against a real `.agents/skills` destination — before/after listing captured for proof
- [ ] Rail: `npm test`, `npm run typecheck`, `npm run verify:agents-block`
- [ ] Post-implementation report + PR

## Progress notes
