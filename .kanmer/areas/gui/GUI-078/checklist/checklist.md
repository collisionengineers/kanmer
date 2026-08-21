# Checklist — GUI-078

*The checklist. Not the plan — every line is **independently tickable**; the reasoning lives in the plan.*

- [x] `demoBoard`: drop `statuses` + `priorities`, add `profiles` + `defaultProfile`
- [x] `demoItems`: drop `priority`, remap v2 stages to the fixed six, add group membership
- [x] `DEMO_DOC_TYPES`: `impact` → `files`, match the v3 type shape
- [x] The six `board.statuses` call sites → the fixed stage list
- [x] `addColumn`: delete the unreachable `statuses` / `priorities` branches
- [x] `migrate`: return `{ v2, backfill, v3 }`
- [x] `getFormat`: `3`
- [x] `getDocsInfo`: add `counts` (derived, not stubbed) and `references`
- [x] `getDocModel`: full `DocModel`
- [x] `getGateStatus`: empty map + a comment saying why the demo evaluates nothing
- [x] **Unplanned:** implement the 12 `ProjectClient` methods the demo never had
- [x] Sweep for surviving v2 vocabulary the compiler cannot see
- [x] Verification run: tsc zero errors, no new casts, `build:ui` emits all three, `index.d.ts` carries the new shapes
- [x] Push, open the PR, record commits/prs

## Progress notes

**2026-08-16 — the twelve errors were not the work.** Fixing them uncovered a
thirteenth that the others had been masking:

```
demo.tsx(317,9): error TS2740: ... is missing the following properties from
type 'ProjectClient': dispatchOptions, getGates, listGroups, getGroup, and 8 more.
```

TS reports property-level mismatches in an object literal before it reports the
literal being structurally incomplete, so the missing methods were invisible
until the mismatches were gone. The demo never implemented **groups**
(`listGroups`, `getGroup`, `createGroup`, `updateGroup`, `getGroupDoc`,
`setGroupDoc`), **references** (`pickReferences`, `addReference`,
`openReference`, `removeReference`), `getGates`, or `dispatchOptions` — the whole
v3 surface.

Implemented as real in-memory fakes rather than throwing stubs, with two demo
groups (`EPIC-001`, `HZN-001`) whose membership is stored **on the tickets** and
derived on read, because that is the actual model and a demo that fakes it
teaches the wrong thing.

**2026-08-16 — open question 2 was answered wrongly, and the build proved it.**

`open-questions` says to import `DEFAULT_PROFILES` and the stage list from
`@kanmer/core` rather than retyping them: *"a hand-copied profile table is the
same class of bug this whole ticket is fixing."* The argument is right and the
conclusion does not work.

It typechecked. Then `npx tsup` failed:

```
✘ [ERROR] Could not resolve "fs"
✘ [ERROR] Could not resolve "path"
✘ [ERROR] Could not resolve "crypto"
```

`@kanmer/core` declares one export (`"."`), and `src/index.ts` re-exports
`store`, `io`, `migrate` and `groups`, which import Node built-ins. This package
builds with `platform: "browser"`. **Types are erased at compile time; values are
not** — which is exactly why the original author's imports were type-only, a
constraint nowhere written down.

Reverted to type-only. The constants are mirrored in **one block** at the top of
`demo.tsx`, each naming its source file, and `deriveMembers` is inlined with the
archived-members rule copied faithfully. The comment says plainly that these are
copies and will drift.

[[CORE-027]] filed for the real fix: a browser-safe subpath export, with a
rail check asserting the emitted browser entry references no `node:` specifier.
Noted there that [[SKILL-013]] is about to change `DEFAULT_PROFILES` — so the
drift this creates has a date on it.

**2026-08-16 — verified.** `npx tsc --noEmit -p packages/ui/tsconfig.json` clean
(from the repo root, where `node_modules` exists — the worktree has none).
`npx tsup` emits `index.js` (233 KB), `index.d.ts` (24.7 KB), `index.css`
(30.3 KB). The emitted `index.d.ts` declares `demoGroups` and carries no v2
vocabulary except one explanatory comment. `dist/` was removed after checking —
it is gitignored and not part of the change.
