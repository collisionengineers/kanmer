---
id: CORE-027
type: ticket
title: Give @kanmer/core a browser-safe subpath export
status: implementing
area: core
assignee: codex-mcp-client
profile: feature
stageEntered:
  preparing: '2026-08-21T00:52:08.922Z'
taken_at: '2026-08-21T00:52:35.910Z'
branch: core-027-browser-subpath
worktree: .worktrees/core-027
labels:
  - design-system
  - packaging
groups:
  - HZN-006
links:
  - GUI-078
docs_todo: true
archived: false
created: '2026-08-16T20:18:36.563Z'
updated: '2026-08-21T00:52:35.910Z'
---

## What

`@kanmer/core` exports one entry point. Add a second that carries only the pure
constants and helpers, so a browser bundle can import them as **values** instead
of copying them.

## Why

`packages/core/package.json` declares exactly one export:

```json
"exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } }
```

and `src/index.ts` re-exports `store`, `io`, `migrate` and `groups`, which import
`node:fs`, `node:path` and `node:crypto`. So **any value import from core pulls
Node built-ins in**, and `@kanmer/ui` builds with `platform: "browser"`.

Measured during [[GUI-078]]. Importing `STAGES` and `DEFAULT_PROFILES` into
`demo.tsx` typechecked cleanly and then failed the build:

```
✘ [ERROR] Could not resolve "fs"
✘ [ERROR] Could not resolve "path"
✘ [ERROR] Could not resolve "crypto"
```

Types are erased at compile time; values are not. That is why the original
author's imports were type-only — a constraint that was never written down, so
GUI-078 rediscovered it the expensive way.

**The cost is a copy.** `demo.tsx` now carries hand-mirrored `STAGE_IDS`,
`DOC_TYPES`, `GATE_EXEMPT_DIRS`, `BOUNDARIES`, `DEFAULT_PROFILES`,
`DEFAULT_PROFILE_ID`, `DEFAULT_PROOF_TYPES` and an inlined `deriveMembers`. They
are collected in one block with their source named, which is the best available
mitigation and not a fix: the next change to `DEFAULT_PROFILES` — and
[[SKILL-013]] is about to make one, adding `enter-review` to `fix` — will
silently desynchronise the design system.

## Which modules are already pure

Checked, not assumed:

- `src/stages.ts` — **no imports at all**.
- `src/profiles.ts` — imports only `./stages.js`.
- `src/groups.ts` — imports `node:path`, `node:fs/promises`, `gray-matter`, `zod`.
  So `deriveMembers` is pure logic in an impure module; splitting it out is part
  of the work, not a given.

## Approach

- Add an `./browser` (or `./pure`) subpath to `exports`, with its own tsup entry
  so `dist/browser.js` exists as a real artifact rather than a mapping into the
  bundle.
- Decide what belongs behind it: stages, profiles, boundaries, proof types, and
  the pure derivations (`deriveMembers`, `requirementsFor`, `parseRequirement`)
  once they are separated from their file-touching neighbours.
- **Add a build-time guard.** The whole failure mode is that a Node import creeps
  into the browser entry and nobody notices until a consumer's build breaks — so
  assert the emitted `dist/browser.js` references no `node:` specifier, in the
  rail rather than in prose.
- Then delete the mirrored block in `demo.tsx` and import for real.

## Verification

- [ ] `import { DEFAULT_PROFILES } from "@kanmer/core/browser"` builds under
      `platform: "browser"` with no `node:` resolution errors.
- [ ] The emitted browser entry contains no `node:` import — asserted by a check
      that runs in the rail.
- [ ] `packages/ui/src/demo.tsx` has no mirrored constants left, and
      `npm run build:ui` still emits all three artifacts.
- [ ] The existing `"."` entry is unchanged — every current consumer keeps
      working.

## Outcome
