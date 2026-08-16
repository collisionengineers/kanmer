# Plan — GUI-080: installing skills never removes one that Kanmer has since deleted

*Written FROM `research` and `files`, and from the operator's answers in
`scratch/operator-answers.md`, which settle the ownership mechanism and its cost.*

## Approach

Kanmer stops treating "what I currently ship" as "what I own" and starts
**recording what it installed**. The destination stamp `.kanmer-skills-version`
grows a **roster**: version on line 1, one owned skill-folder name per line
below. That format is deliberate — `skillsStatus` reads the file and `.trim()`s
the whole thing as a version, so a JSON stamp would feed an older Kanmer a
garbage version string; a line-oriented stamp degrades to a harmless
"no update available" instead.

Three behaviours follow from the roster, and they are the operator's chosen
option in full:

1. **Install reconciles instead of overlaying.** Owned folders are replaced
   **wholesale** (`rm` then `cp`), not merged. Merging is what left
   `kanmer-research/assets/impact-template.md` behind when it was renamed —
   retirement has two shapes (a deleted folder *and* a deleted file inside a
   surviving folder) and only wholesale replacement catches both. Any
   previously-recorded skill absent from the new bundle is pruned.
2. **A closed tombstone list repairs history.** The roster only knows about
   installs made *after* this ships, so the two residues that prompted the
   ticket — `kanmer-import/` and `kanmer-research/assets/impact-template.md`,
   both retired by `130f837` — need a shipped constant. It is **closed at
   exactly those two entries and never grows**: once the roster ships, every
   future retirement is the roster's job. A tombstone list that grows is a
   second source of truth. This is stated in the code comment and in the FRD
   prose, not just here.
3. **Disconnect reads the roster too.** `removeBundledSkillsOnly` currently
   `readdir`s the *currently bundled* names, so a retired skill survives
   disconnect as well — the one operation whose entire job is to leave nothing
   behind. Its doc comment ("the bundled skills Kanmer owns") is the bug
   written down and gets rewritten.

**What was rejected and why.** Prefix-matching `kanmer-*` needs no state and
works retroactively, but it converts a naming convention into deletion
authority over folders Kanmer never wrote — it would delete a user's own
`kanmer-mine`. A per-folder `.kanmer-owned` marker has the same
pre-mechanism blind spot as the roster plus a new file in a directory every
host parses. A shipped version→roster history table repairs everything but must
be maintained forever, and is useless where no stamp was ever written.
`rm -rf` and re-copy is off the table outright: `connect.test.ts:14-33` is an
executable promise that a foreign skill and a loose file survive, byte for
byte. **The roster is what makes deletion safe**, and that invariant must get
*stronger* here, not weaker, because this ticket is where Kanmer gains the power
to delete.

**The cost is accepted and must be reported.** Wholesale replacement discards a
local edit inside a Kanmer-owned skill folder. That is correct under ADR-0009
("install-time copies", the bundle is the source of truth) but it is the user's
directory, so Connect **names the folders it replaced** in its output. Folders
that did not previously exist are reported as installed, not replaced — on a
first connect nothing could have been lost, and saying otherwise would be noise.

**Not in this ticket:** bumping `plugins/kanmer/.claude-plugin/plugin.json` off
`0.1.0`. **MCP-011 owns that bump** and two tickets editing one file is a
conflict. The consequence is stated plainly in `proof`: while it sits at
`0.1.0`, `bundledSkillsVersion()` can never report an update, so
`Settings.tsx:417-437` never renders the "Update skills" button — the affordance
this ticket repairs stays **unreachable until MCP-011 lands**. Connect is the
reachable entry point today.

## Governing docs

**`docs/functional/frd/FRD-012-connect.md`** — *Meets* and *Modifies*
(modification explicitly authorized by the operator: "Say so in the code and in
the ADR/FRD prose").

- **R2** ("All copies stamped (`.kanmer-skills-version`) with the existing
  update-offer flow") — *Meets*: the stamp stays the sanctioned mechanism and
  keeps its filename and its version-first line, so the update-offer flow is
  untouched. *Modifies*: R2 gains a sentence saying the stamp also records the
  installed **roster**, that install is a **reconciliation** of owned folders
  (replaced wholesale, retired ones pruned) rather than an overlay, and that the
  tombstone list repairing pre-roster installs is closed at two entries and
  never grows.
- **R4** ("Disconnect reverses exactly what connect wrote") — *Meets*, and this
  is the sentence the current code violates: `removeBundledSkillsOnly` reverses
  what connect *currently ships*, not what it *wrote*. Reading the recorded
  roster is what makes R4 true. *Modifies*: R4 gains the roster clause and the
  peer clause (a shared `.agents/skills` is not removed while another host that
  writes the same directory is still registered).
- **Acceptance criteria** — one new criterion: installing a bundle that has
  retired a skill leaves no trace of it at the destination, while a
  user-authored skill beside it survives byte for byte.

**`docs/functional/frd/FRD-013-setup-as-reconciliation.md`** — *Meets*, no
change. R1(a) makes "install/refresh" a reconciliation on every run; this ticket
supplies the missing half of that word for skills — until now "refresh" could
only add. FRD-013 needs no amendment because it already says the right thing;
the code did not do it.

**`docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md`** — *Meets*,
no change, but load-bearing twice. (a) "install-time copies… the bundle is the
source of truth" is the authority for replacing owned folders wholesale.
(b) "Connect installs the roster **atomically as sibling directories**; that is
a stated constraint on installs" is why the peer guard below is a correctness
fix and not a nicety: `.agents/skills` serves opencode *and* antigravity, and a
half-removed roster breaks every cross-skill reference to
`kanmer-tickets/references/tool-reference.md`.

**No new ADR.** The decision this implements — reconcile, don't overlay — is
already ADR-0010's principle and FRD-012 R2's mechanism. The roster is an
extension of a sanctioned file's format, not a new architectural commitment.

## Steps

1. **`providers.ts` — the stamp becomes parseable.** Beside `isNewerVersion`
   (pure, filesystem-free, as that module already works):
   - `formatSkillsStamp(version, roster)` → version on line 1, sorted roster
     below, trailing newline.
   - `parseSkillsStamp(contents)` → `{ version, roster }`, where `roster` is
     `null` for a legacy bare-version stamp (the "I do not know what I own"
     signal) and `[]` is a real, empty roster. Tolerates CRLF and blank lines.
   - `RETIRED_SKILL_PATHS` — the **closed** tombstone list, exactly
     `kanmer-import` and `kanmer-research/assets/impact-template.md`, carrying
     the comment that it is closed and why.
2. **`connect.ts` — extract a testable seam.** Add
   `reconcileSkills(destination, bundledSkillsRoot, version)`, exported, taking
   both roots as parameters — the same seam `removeBundledSkillsOnly` already
   uses for its bundle root, so tests drive real directories without stubbing
   `pluginRoot()`. It returns what it did (`installed`, `replaced`, `removed`)
   so the caller can report it.
3. **`reconcileSkills` body.** Read the destination stamp → `owned` = recorded
   roster, or, when the stamp predates the roster, fall back to the currently
   bundled names (today's behaviour: conservative, deletes nothing it cannot
   account for). Prune `owned` minus the new bundle. Apply the tombstone list.
   Then, for each bundled folder, `rm` the destination folder and `cp` the
   bundle's — wholesale, so a stale file inside a surviving folder cannot
   outlive it. Write the new stamp last, so a crash mid-reconcile leaves a stamp
   that under-claims rather than over-claims ownership. Keep the existing
   path-escape guard on every name read off disk.
4. **`installSkills` calls it** and reports: `replaced` folders are named in the
   output with the reason ("local edits discarded"), `removed` folders are named
   as retired, and a first install says `installed` instead of `replaced`.
5. **`removeBundledSkillsOnly` reads the roster.** Recorded roster first,
   `readdir(bundledSkillsRoot)` only as the legacy fallback; tombstones applied
   as well; stamp removed; empty directory removed. Rewrite the doc comment —
   it currently equates "owns" with "currently ships", which is the defect
   stated as intent.
6. **Take the disconnect peer guard** (the delegated judgement call). It is
   ~6 lines inside `disconnectAgent`, a function already being changed, so it
   rides along rather than becoming a ticket. `disconnectAgent:307-311` removes
   the skills directory unconditionally while `hasRegisteredCopySkillsPeer`
   guards the AGENTS block eight lines below. The existing helper is not
   directly reusable: it answers "is *any* copy-skills peer registered", which
   would wrongly retain `.agents/skills` because grok (a different directory) is
   connected. Give it an optional `skillsDir` filter so the skills removal asks
   the narrower question — *is a peer that writes **this** directory still
   registered* — while the AGENTS-block call keeps its current broad semantics
   and its existing test.
7. **`updateSkills` needs no change** and that is the point: it is a one-line
   wrapper, so fixing `installSkills` is what stops it reproducing the bug. Its
   comment gets a line saying so.
8. **`skillsStatus` parses the stamp** with `parseSkillsStamp(...).version`
   instead of trimming the whole file, so the current reader stays exactly
   correct. `SkillsStatus` keeps its shape — no IPC ripple across the five
   files `files` lists.
9. **Tests — `providers.test.ts`**: stamp round-trip; legacy bare version →
   `roster: null`; blank and corrupt input; CRLF.
10. **Tests — `connect.test.ts`, extended not replaced.** The existing
    foreign-skill case at 14-33 is the invariant and must stay green untouched.
    Add: a recorded-but-retired folder is pruned while a foreign folder and a
    loose file survive byte for byte; a stale file inside a surviving owned
    folder is gone after reconcile; a legacy (rosterless) stamp deletes nothing
    it cannot account for; the tombstoned `kanmer-import` is removed from a
    pre-roster install; `removeBundledSkillsOnly` removes a roster-recorded
    skill that the current bundle no longer has; disconnecting opencode retains
    `.agents/skills` while antigravity is registered but not when only grok is.
11. **FRD-012 prose** — R2, R4 and one acceptance criterion, per Governing docs
    above.
12. **Rail** — `npm test`, `npm run typecheck`, `npm run verify:agents-block`.

## Verification

Proof comes from a **real `copySkills` destination**, not from `.claude/skills/`.
Research established that directory was never written by `installSkills` —
`claude` and `codex` are `marketplace` providers and there is no
`.kanmer-skills-version` in it at all; it is the operator's hand-made mirror.
The genuine destinations are `.agents/skills` (opencode **and** antigravity) and
`.grok/skills`.

1. **Automated, and it is the real code path.** The new `connect.test.ts` cases
   build an actual `.agents/skills` tree in a temp project, seed it with a
   retired skill (`kanmer-import`) and a foreign one (`mycompany-review`), run
   the real `reconcileSkills`, and assert the retired one is gone and the
   foreign one survives byte for byte.
2. **A demonstration run** whose before/after directory listing goes into
   `proof` verbatim — seeded destination, install, listing — so the deletion is
   visible rather than asserted.
3. **Rail:** `npm test`, `npm run typecheck`, `npm run verify:agents-block`,
   each with its output.
4. **The unreachability statement.** `proof` says plainly that with
   `plugin.json` at `0.1.0` the "Update skills" button never renders, names
   **MCP-011** as the ticket that makes it reachable, and therefore claims only
   what Connect actually does today. Proof that claimed the button works would
   be false.
5. **Marketplace hosts recorded as unchecked.** Both Claude Code and codex
   extract plugins to `cache/<marketplace>/<plugin>/<version>/`, so they prune
   by construction *when the version moves* — which it currently does not. The
   command that would settle it (`claude plugin install kanmer@kanmer` twice
   across a retirement) was not run: Kanmer's marketplace is not registered on
   this machine. Recorded as layout evidence plus caveat, named unchecked,
   per the ticket's own "or named as unchecked".

## Risks / open questions

- **Deleting in a directory the user shares with Kanmer.** The whole risk of
  the ticket. Mitigation: the roster is the only deletion authority, the
  tombstone list is a closed two-entry constant, the legacy path deletes nothing
  it cannot account for, the existing foreign-skill test stays green untouched,
  and every name read off disk keeps the path-escape guard.
- **Wholesale replacement discards local edits.** Accepted by the operator.
  Mitigation: Connect names the replaced folders, so a user who customised a
  skill in place learns it from Kanmer rather than from losing it.
- **Stamp format change read by an older Kanmer.** A pre-fix Kanmer trims the
  whole file, so it sees a multi-line string, `isNewerVersion` returns false and
  the update button stays hidden. Harmless in the only place it is used, and
  strictly better than JSON, which would compare lexically against a brace.
- **The peer guard changes disconnect behaviour.** Mitigation: the broad
  `hasRegisteredCopySkillsPeer` semantics and its existing test are untouched;
  the skills removal gets the narrower directory-scoped question, tested both
  ways (peer sharing the directory → retained; peer with a different directory →
  removed).
- **GUI-079 shares `connect.ts` and `providers.ts`** and is waiting on this to
  merge. Mitigation: report the merge explicitly so GUI-079 can rebase.
