# Post-implementation report — GUI-080

## Summary

Skill install stops being an overlay. The destination's `.kanmer-skills-version`
stamp now records a **roster** — the skill folders Kanmer wrote there — below
the version on line 1, and install **reconciles** against it: owned folders are
replaced wholesale, roster-recorded folders the bundle no longer ships are
pruned, and a closed two-entry tombstone list repairs installs made before the
roster existed. All three broken sites are fixed by that one mechanism:
`installSkills` reconciles, `updateSkills` inherits it by being a wrapper, and
`removeBundledSkillsOnly` reads the recorded roster instead of enumerating the
live bundle — so a retired skill no longer survives disconnect either. A
demonstration run against a real seeded `.agents/skills` removes both residues
CORE-023 names (`kanmer-import`, `kanmer-research/assets/impact-template.md`)
while leaving the operator's own `run-kanmer` untouched.

## Changes

| File | Change | Why |
|---|---|---|
| `apps/gui/src/main/providers.ts` | added `SkillsStamp`, `formatSkillsStamp`, `parseSkillsStamp`, `RETIRED_SKILL_PATHS` | The stamp becomes the ownership record. Line-oriented, not JSON: `skillsStatus` used to `.trim()` the whole file as the version, so a pre-fix Kanmer fed JSON would compare `{"version":…` lexically; fed this it loses every numeric comparison and reports "no update available" — wrong in the harmless direction. Parse/serialise are pure, beside `isNewerVersion`, testable without the filesystem, matching how the module already works. |
| `apps/gui/src/main/providers.ts` | `RETIRED_SKILL_PATHS`, with a comment stating the list is **closed** | The two paths `130f837` retired, and between them the two shapes retirement takes: a whole folder and a file inside a folder that survives. Nothing is ever added — later retirements are the roster's job, and a growing list would be a second source of truth about what Kanmer owns. |
| `apps/gui/src/main/connect.ts` | new `reconcileSkills(destination, bundledSkillsRoot, version)`, exported | The fix, and the test seam. Both roots are parameters rather than resolved from `pluginRoot()`, the same seam `removeBundledSkillsOnly` already used, so the tests drive real directories without stubbing the plugin root. |
| `apps/gui/src/main/connect.ts` | `isSafeSkillSegment`, `bundledSkillNames`, `recordedRoster`, `removeRetiredPaths` | Small named pieces. `isSafeSkillSegment` is the guard between "a name we found" and `rm(…, { recursive: true })` — and it matters more now than before, because names arrive from a *file a user can edit*, not only from `readdir`. |
| `apps/gui/src/main/connect.ts` | `installSkills` reconciles and reports | Wholesale replacement discards local edits inside a Kanmer-owned skill folder. Accepted under ADR-0009, but Connect names the folders it replaced: a silent delete inside the user's own directory is exactly what this must not be. A first install reports `installed`, not `replaced` — nothing could have been lost. |
| `apps/gui/src/main/connect.ts` | `removeBundledSkillsOnly` reads the roster; doc comment rewritten | The old comment ("the bundled skills Kanmer owns") was the defect stated as intent: it equated *owns* with *currently ships*. `bundledSkillsRoot` survives as the fallback for a pre-roster stamp and as the tests' seam. |
| `apps/gui/src/main/connect.ts` | `hasRegisteredCopySkillsPeer` gains an optional `skillsDir`; `disconnectAgent` guards the skills removal with it | The delegated judgement call, **taken**. See Risks below. |
| `apps/gui/src/main/connect.ts` | `skillsStatus` parses the stamp instead of trimming it; `updateSkills` comment | `SkillsStatus` keeps its shape, so none of the five IPC files move. |
| `apps/gui/src/main/providers.test.ts` | +7 cases | Stamp round-trip, version-first, legacy bare version → `roster: null`, genuinely-empty roster, CRLF/whitespace, unrecognised (JSON) input, and an assertion pinning the tombstone list at exactly two entries — a guard on the *decision*, not the code. |
| `apps/gui/src/main/connect.test.ts` | +9 cases, existing two untouched | The 14-33 foreign-skill contract is the invariant this ticket must strengthen while gaining the power to delete; it is unchanged and green. |
| `docs/functional/frd/FRD-012-connect.md` | new R2a, R4 amended, acceptance criterion 5 | Operator-authorized (see Governing docs). |

## Governing docs

**`docs/functional/frd/FRD-012-connect.md` — meets and modifies.** The
modification is explicitly authorized: the operator's answer requires the closed
tombstone list to be stated "in the code and in the ADR/FRD prose", on the
grounds that a tombstone list which grows is a second source of truth.

- **R2** — *meets*, unchanged: the stamp keeps its filename, keeps the version
  on its first line, and the update-offer flow is untouched.
- **R2a** — *new*. Says install is a reconciliation, not an overlay; that the
  stamp carries the roster; that owned folders are replaced wholesale and the
  replacement is named in the output; that the roster is the only deletion
  authority and never a name prefix; that an unrostered stamp makes Kanmer
  delete less; and that the tombstone list is closed.
- **R4** — *modified*. "Disconnect reverses exactly what connect wrote" was the
  sentence the code violated. R4 now says plainly that "what connect wrote" is
  the recorded roster, not the currently-bundled names, and adds the shared-
  directory clause.
- **Acceptance criterion 5** — *new*: retire a skill, install again, it is gone
  and a user-authored skill beside it survives byte for byte.

**`docs/functional/frd/FRD-013-setup-as-reconciliation.md` — meets, unchanged.**
R1(a) already makes install/refresh a reconciliation on every run. The doc was
right; the code only ever did the "add" half of it. No amendment needed.

**`docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md` — meets, not
in `refs`, load-bearing twice.** "Install-time copies… the bundle is the source
of truth" is the authority for replacing owned folders wholesale. "Connect
installs the roster atomically as sibling directories — a stated constraint on
installs" is why the peer guard is a correctness fix.

**No new ADR.** Reconcile-don't-overlay is already ADR-0010's principle and
FRD-012 R2's mechanism; the roster extends a sanctioned file's format rather
than making a new architectural commitment.

## Risks / follow-ups

**The disconnect peer guard: taken, not filed.** `disconnectAgent` removed the
skills directory unconditionally while `hasRegisteredCopySkillsPeer` guarded the
AGENTS block eight lines below. It came to ~10 lines inside a function already
being changed, so it rides along. One thing worth a reviewer's eye: the existing
helper was **not** directly reusable. It answers "is *any* copy-skills peer
registered", which would have retained `.agents/skills` merely because grok — a
different directory — was connected. It therefore gains an optional `skillsDir`
filter, used only by the skills removal; the AGENTS-block call keeps its broad
semantics and its existing test. Both directions are tested.

**`plugin.json` deliberately not bumped.** It stays at `0.1.0`; **MCP-011** owns
that bump and two tickets editing one file is a conflict. The consequence is
real and is stated again in `proof`: while it sits there, `bundledSkillsVersion()`
can never report an update, so `Settings.tsx:417-437` never renders the "Update
skills" button. **The affordance this ticket repairs is unreachable until
MCP-011 lands.** Connect is the reachable entry point today, and it exercises
exactly the same code.

**Marketplace hosts: recorded as unchecked, per the ticket's own allowance.**
Claude Code and codex extract plugins to `cache/<marketplace>/<plugin>/<version>/`,
so they prune by construction *when the version moves* — which, frozen at
`0.1.0`, it does not. The command that would settle it
(`claude plugin install kanmer@kanmer` twice across a retirement) was not run:
Kanmer's marketplace is not registered on this machine, registering it is a
mutation, and it is blocked anyway by the manifest-path defect **MCP-009** and
**MCP-011** own.

**Wholesale replacement discards local edits** inside a Kanmer-owned skill
folder. Operator-accepted; mitigated by naming the replaced folders in the
Connect output. On a re-connect that output lists all twelve, which is verbose —
deliberately, because the alternative is a silent delete.

**Two small additions the plan did not name**, both recorded in the checklist's
progress notes rather than left for review to find: the roster is introduced by
a literal `skills:` marker line (without it, an empty roster is indistinguishable
from a legacy stamp, and that distinction is what decides whether Kanmer may
delete), and a path-escape test covers a poisoned roster (`..`, `../..`,
`sub/dir`).

**`Settings.tsx:405-410` hint prose is still stale** — it says opencode and
Antigravity get "the shared AGENTS.md block for hosts that only read skills
globally" when they now get a project `.agents/skills` copy. Adjacent and cheap,
but a different surface, and **GUI-079 shares this area** — left alone rather
than smuggled in.

**GUI-079 shares `connect.ts` and `providers.ts`** and is waiting on this to
merge, so it should rebase onto it.

## Verification hand-off

On merged `main`:

1. `npm test` — core + GUI suites green (expect 182 + 218).
2. `npm run typecheck` — all four workspaces named in the output.
3. `npm run verify:agents-block` — 26/26.
4. **The demonstration**, which is the evidence that matters: seed a
   `.agents/skills` as a v2-era install (`kanmer-import/`,
   `kanmer-research/assets/impact-template.md`, a bare `0.1.0` stamp, plus a
   user-authored `run-kanmer/`), run `reconcileSkills` against the real
   `plugins/kanmer/skills` bundle, and capture the before/after listing. Expect:
   both retired paths gone, `files-template.md` present, `run-kanmer/` and its
   bytes untouched, and a stamp reading `0.1.0` / `skills:` / twelve names.
5. No UI screenshots: the button this repairs cannot render until MCP-011 bumps
   `plugin.json`, and `proof` must say so rather than imply otherwise.
