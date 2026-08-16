# Checklist — GUI-080

*Derived from plan.md, one box per step.*

- [x] `providers.ts`: add `formatSkillsStamp` / `parseSkillsStamp` (version line 1, roster below; legacy bare version → `roster: null`) beside `isNewerVersion`
- [x] `providers.ts`: add `RETIRED_SKILL_PATHS` — the closed two-entry tombstone list, with the comment saying it never grows and why
- [x] `connect.ts`: add exported `reconcileSkills(destination, bundledSkillsRoot, version)` returning `{ installed, replaced, removed }`
- [x] `reconcileSkills`: prune roster-recorded folders absent from the new bundle; fall back to bundled names when the stamp has no roster; keep the path-escape guard
- [x] `reconcileSkills`: apply the tombstone list (folder and intra-folder file)
- [x] `reconcileSkills`: replace each owned folder wholesale (`rm` then `cp`), then write the new stamp last
- [x] `installSkills`: call `reconcileSkills` and report replaced folders by name ("local edits discarded"), removed retired folders by name, and installed-not-replaced on a first install
- [x] `removeBundledSkillsOnly`: read the recorded roster, fall back to `readdir(bundledSkillsRoot)`, apply tombstones; rewrite the doc comment that equates "owns" with "currently ships"
- [x] `disconnectAgent`: guard the skills removal with a directory-scoped peer check (optional `skillsDir` filter on `hasRegisteredCopySkillsPeer`), leaving the AGENTS-block call's broad semantics unchanged
- [x] `skillsStatus`: read the version via `parseSkillsStamp` instead of trimming the whole file; `SkillsStatus` shape unchanged (no IPC ripple)
- [x] `updateSkills`: comment noting it inherits the reconcile through `installSkills`
- [x] `providers.test.ts`: stamp round-trip, legacy bare version, blank, corrupt, CRLF
- [x] `connect.test.ts`: retired roster folder pruned while a foreign folder and loose file survive byte for byte
- [x] `connect.test.ts`: stale file inside a surviving owned folder is gone after reconcile (the `impact-template.md` shape)
- [x] `connect.test.ts`: a rosterless (legacy) stamp deletes nothing it cannot account for
- [x] `connect.test.ts`: tombstoned `kanmer-import` removed from a pre-roster install
- [x] `connect.test.ts`: `removeBundledSkillsOnly` removes a roster-recorded skill the current bundle no longer has; existing foreign-skill test still green untouched
- [x] `connect.test.ts`: disconnecting opencode retains `.agents/skills` while antigravity is registered, and removes it when only grok is
- [x] FRD-012: amend R2 (roster + reconcile-not-overlay + closed tombstone list) and R4 (roster + peer clause); add the acceptance criterion
- [x] Demonstration run against a real `.agents/skills` destination — before/after listing captured for proof
- [x] Rail: `npm test`, `npm run typecheck`, `npm run verify:agents-block`
- [x] Post-implementation report + PR

## Progress notes

**Two additions the plan did not name, both small and both stated here rather
than discovered in review.**

1. **The roster needed a marker line.** The plan promised that `[]` is a real,
   empty roster and `null` is "I do not know what I own", but a bare
   `version\nname\nname` format cannot tell an empty roster from a legacy
   one-line stamp. The stamp therefore introduces the roster with a literal
   `skills:` line: `0.2.0\nskills:\nkanmer-auto\n…`. It costs one line, makes
   the file self-describing to anyone who opens it, and keeps the distinction
   that decides whether Kanmer may delete.

2. **A path-escape test.** Every folder name Kanmer deletes is now read out of a
   file a user can edit, not just off disk. `isSafeSkillSegment` rejects `.`,
   `..` and any embedded separator on both the roster and the tombstone paths,
   and `connect.test.ts` asserts a poisoned roster (`..`, `../..`, `sub/dir`)
   leaves a file outside the destination untouched.

**The demonstration run used the real skill bundle** (`plugins/kanmer/skills`,
12 folders) against a seeded v2-era `.agents/skills`. Output captured in
`proof`: `kanmer-import` and `kanmer-research/assets/impact-template.md` both
removed, `files-template.md` present, the operator's own `run-kanmer` untouched,
roster stamped. That is CORE-023's two named residues repaired in one run.

**Rail green:** `npm test` (core 182 + gui 218), `npm run typecheck` (all four
workspaces named), `npm run verify:agents-block` (26/26).
