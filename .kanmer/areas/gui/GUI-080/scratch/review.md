## Review — GUI-080 / PR #41 (2026-08-16)

**I am both author and reviewer of this PR. This is a self-review and should not
be read as an independent one.** What follows is a genuine re-read of the diff
against the report, the plan's Governing-docs section and the `files` document's
ripple list — but nobody else has looked at it.

### 1. Changes (reviewer's own reading of the diff)

Five files, +~350/−15.

- **`providers.ts`** — four additions, all pure and filesystem-free, sitting
  beside `isNewerVersion` where the module's other pure helpers live.
  `SkillsStamp` / `formatSkillsStamp` / `parseSkillsStamp` turn the stamp from a
  bare version string into `version` + `roster`, with a literal `skills:` marker
  line separating them. `RETIRED_SKILL_PATHS` is a two-element frozen-by-
  convention constant carrying a comment that says the list is closed.
- **`connect.ts`** — four new private helpers (`isSafeSkillSegment`,
  `bundledSkillNames`, `recordedRoster`, `removeRetiredPaths`), one new exported
  function (`reconcileSkills`) and its result type. `removeBundledSkillsOnly`
  keeps its signature and its third-parameter seam but changes its authority
  from `readdir(bundle)` to the recorded roster. `installSkills`'s copySkills
  branch loses its `mkdir`/`cp`/`writeFile` trio and gains a `reconcileSkills`
  call plus output assembly. `skillsStatus` swaps `.trim()` for
  `parseSkillsStamp(...).version`. `hasRegisteredCopySkillsPeer` gains an
  optional third parameter. `disconnectAgent` branches the skills removal on it.
  `updateSkills` — comment only, no behaviour change, which is the point.
- **`connect.test.ts`** — +9 cases in three new describes, plus three small
  helpers (`tempRoot`, `writeTree`, `missing`). The two pre-existing cases are
  byte-unchanged.
- **`providers.test.ts`** — +7 cases in one new describe; nothing existing moved.
- **`FRD-012-connect.md`** — R2a added, R4 rewritten, acceptance criterion 5
  added.

### 2. Comments

**C1 (non-blocking, verified rather than raised).** `installSkills` dropped its
`mkdir(dest, { recursive: true })`, and `reconcileSkills` only mkdirs *after*
its prune loop. On a first install the prune loop therefore runs against a
directory that does not exist. Checked: `recordedRoster` and every prune branch
guard on `existsSync` first, so it is a no-op rather than a throw, and the
"reports a first install as installed" test exercises exactly that path against
a `.grok/skills` that was never created. Correct, but it is load-bearing
ordering that a future edit could break silently.
*Disposition: won't-do — the test pins it.*

**C2 (non-blocking).** `removeRetiredPaths` deletes
`kanmer-research/assets/impact-template.md` and can leave an empty `assets/`
directory behind when `kanmer-research` is neither bundled nor rostered. In
every realistic case the folder is bundled and gets replaced wholesale a moment
later, which is what the demonstration run shows. Cosmetic residue in a case
that requires a bundle with no `kanmer-research` in it.
*Disposition: won't-do — pruning empty ancestors is more deletion logic than the
symptom justifies, and more deletion logic is the thing to be stingy with here.*

**C3 (non-blocking).** The copySkills disconnect path now calls
`hasRegisteredCopySkillsPeer` twice — once directory-scoped for the skills, once
broad for the AGENTS block — so peer config files are read twice. Negligible
cost, and collapsing them would mean conflating two questions that are
deliberately different. Worth noting that the two can never disagree in the
unsafe direction: a peer sharing the directory is also a peer, so skills are
never removed while the block is retained.
*Disposition: won't-do, reasoning recorded here.*

**C4 (non-blocking).** `installSkills`'s output on a re-connect names all twelve
replaced folders, which is a long status line in `Settings.tsx`'s
`connect-status`. That verbosity is the operator's explicit requirement — the
alternative is deleting a user's local edits silently — and the first-install
case, which is the common one, stays short because nothing was replaced.
*Disposition: won't-do — it is the decision, not a defect.*

**C5 (non-blocking, follow-up).** `Settings.tsx:405-410` still describes opencode
and Antigravity as receiving "the shared AGENTS.md block for hosts that only
read skills globally" when they receive a project `.agents/skills` copy. The
`files` document flagged it as cheap-to-fix-while-in-the-file, but this PR never
opens that file and **GUI-079 shares this area**.
*Disposition: deliberately not fixed; named in the report's Risks so it is not
lost. Not filed as a blocking ticket — it blocks nothing and inventing a ticket
for one stale sentence in a file another in-flight ticket owns would be worse
than the sentence.*

**C6 (blocking if it had failed — it did not).** The invariant this ticket must
not weaken. `connect.test.ts:14-33` asserts a foreign `mycompany-review/`, a
loose `user.txt` and their bytes survive removal. Confirmed byte-unchanged in
the diff and green in the run. Two of the new cases restate it against the *new*
deletion paths, and one asserts a poisoned roster (`..`, `../..`, `sub/dir`)
cannot reach a file outside the destination. Given that this PR is precisely
where Kanmer gains the power to delete inside a user-shared directory, that
coverage is the thing I most wanted to see and it is there.
*Disposition: satisfied.*

### 3. Report against diff

`post-implementation-report` lists all five files with rationales that match
what the diff does. Spot-checked the three claims most able to be wrong:

- "the existing 14-33 contract is unchanged" — true, verified line by line.
- "`SkillsStatus` keeps its shape, so none of the five IPC files move" — true;
  no file outside the five in the diff, and `readOnly.test.ts`'s method
  allow-list is untouched and green.
- "`updateSkills` inherits the fix by being a wrapper" — true; comment-only
  change, and the fix reaches it through `installSkills`.

The report also volunteers the two additions the plan did not name (the
`skills:` marker line, the path-escape test) rather than leaving review to find
them. Both are in the checklist's progress notes too.

### 4. Governing docs

- **FRD-012 R2** — met, unchanged. Stamp filename, version-first line and the
  update-offer flow all survive.
- **FRD-012 R2a / R4 / AC5** — modified, and the authorization is real and
  specific: the operator's answers require the closed tombstone list to be
  stated "in the code and in the ADR/FRD prose". The prose says what the code
  does; I checked the direction of that dependency rather than assuming it.
- **FRD-013 R1(a)** — met, no change. The doc already said "reconcile"; the code
  only did the additive half.
- **ADR-0009** — met, not in `refs`. Load-bearing for wholesale replacement
  ("install-time copies") and for the peer guard (roster atomicity).
- **No new ADR**, and none needed: this extends a sanctioned file's format under
  an existing principle rather than making a new architectural commitment.

### 5. Ripple effects from `files`

Followed: `connect.test.ts` and `providers.test.ts` extended; `skillsStatus`
updated for the format change; `ConnectResult.output` prose now reports
removals, which `files` specifically asked for. Correctly untouched: the five
IPC files (shape unchanged), `apps/gui/out/**` (generated). Deliberately not
touched and named: `Settings.tsx` hint prose (C5), `plugin.json` (MCP-011).

### 6. Verdict

**PASS.** Checked: the full diff against the report; the plan's Governing-docs
section against FRD-012/FRD-013/ADR-0009; the `files` ripple list; the rail
(`npm test` core 182 + gui 218, `npm run typecheck` across all four workspaces,
`npm run verify:agents-block` 26/26); and a demonstration run against the real
12-skill bundle and a seeded v2-era `.agents/skills`, which removed both
residues CORE-023 names and left the operator's own `run-kanmer` byte-intact.

No blocking comments, so no PR-review tickets filed. Open questions: all ticked
or explicitly parked before this stage, and nothing in this review turns on a
parked one. Merging under the standing delegation and moving to Verifying.
