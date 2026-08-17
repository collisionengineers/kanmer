# Review — SKILL-013, PR #56

**I am both author and reviewer.** This is not an independent review and should
not be read as one. Where I could not be a useful critic of my own decisions I
have said so rather than writing a confident line.

Reviewed against: `plan` (including its self-correction), `files`,
`post-implementation-report`, `open-questions`, `scratch/operator-answers.md`,
and `gh pr diff` over 32 files.

## 1. Changes — what the diff actually does

**Core (the gate change).** `profiles.ts` adds one line to `DEFAULT_PROFILES.fix`.
`board.ts` adds `injectFixEnterReview()` — 15 lines of code under 35 lines of
comment — called at the top of `resolveProfiles` before the existing
`questions-resolved` loop. The function is a pure map transform with three
guards: profile absent, boundary already present (via `in`, so an explicit `[]`
counts), otherwise append. Nothing else in core changed behaviourally.

**Core (tests).** `profile-matrix.test.ts` is new: 15 moves × 4 profiles asked of
`evaluateGateReport` + `collapsesPipeline` with an all-satisfied `EvidenceProbe`,
four named assertions on the rows that matter, and a snapshot for the rest.
`board.test.ts` gains six cases for the injection. `store.test.ts` and
`smoke.mjs` change one collapse assertion each from 2 gates to 3.

**The block.** `agents-block-body.mjs` is new and holds `START`/`END`/`BLOCK_BODY`
as pure data. `agents-block.mjs` loses its literal and re-exports. The GUI's
`agentsBlock.ts` loses a 13-line stale literal and re-exports the same module. A
hand-written `.d.mts` gives the TS side types without `allowJs`. `AGENTS.md` and
the fenced copy in `kanmer-setup/SKILL.md` are regenerated.

**Skills.** Nine SKILL.md files, one to three sentences each; `kanmer-closeout`
also gains a table row. Net across the roster: +~55 lines of invariant, −6
per-profile claims.

**Scripts.** `verify-skill-prose.mjs` new (278 lines, over half comment).
`verify-agents-block.mjs` 26 → 28 checks and one tightened. `release.mjs` +1 step.

**Docs.** ADR-0014 new; ADR-0011 gains a limits section; FRD-023's stale
verification bullets struck through; release notes gain an upgrade section.

## 2. Comments

**C1 — non-blocking, accepted. The block got longer, against the plan's
prediction.** +273 bytes. The author corrected the plan in place rather than
leaving it wrong, considered the pre-registered fallback, and declined it with a
reason. I agree with declining: the `board.yml` clause is the highest-value
addition and cutting it would not have reached "shorter" anyway. But I note this
is me agreeing with myself, and it is the single most reversible decision in the
PR — flagged as such in both the report and the PR body so a second reader can
overturn it cheaply.

**C2 — non-blocking, accepted with evidence. Check 7 was revised after seeing its
output.** Twice. This is the failure mode the plan itself named as a risk. What
makes it acceptable rather than self-serving is that the check is validated
against the **pre-change tree** after every revision — 8 violations there, 0 here
— so the revisions cannot have been shaped to let the current tree pass. The
first revision (deleting the illustrative carve-out) made the check *stricter*
and cost extra work, which is the opposite direction from tuning-to-pass.

**C3 — non-blocking, accepted. Check 8 is scope beyond the ported script.** It
asserts invariants are *present*, which no prior check did. Justified by the
ticket's own subject (the rule was in 1 of 12 skills), but the `owed` lists are
editorial and will need maintaining when the roster changes. Recorded here so the
next person knows they are a judgement, not a derivation.

**C4 — non-blocking, filed. `plugin:check` could not run.** MCP-007's guard is a
path test whose stated premise is false in a worktree prepared with MCP-010's
recipe. The author evidenced provenance directly instead of routing around the
guard, which is the right call. **Filed as a ticket** — the guard could test
resolution rather than path.

**C5 — non-blocking, filed. Two ADR-0013s on main.** Pre-existing, created by two
tickets in flight. Correctly not fixed here. **Filed**, together with the
three-line rail check that would have caught it.

**C6 — non-blocking, noted. `.claude/skills/` is not refreshed** by this PR, so
the running agent still reads the old prose until re-synced. Out of scope by the
`files` document; CORE-023 owns the mechanism.

**C7 — I cannot review this well: the prose itself.** Nine skills gained
sentences I wrote, judged against a rule I derived. The mechanical part is
checked (the rule is now enforced by a committed script, validated against a
tree that fails it). Whether the sentences are *well written* is not something I
can assess from here.

## 3. Check — report against diff, governing docs, code

**Report against diff:** every changed file appears in the report's tables with a
rationale. Three deviations are disclosed prominently rather than buried, and one
unplanned change (`kanmer-tickets`' final-stage claim) is called out as unplanned.
The report's "what did NOT happen" section covers all three omissions. **Holds.**

**Governing docs:**
- FRD-023 R1 — met, and now mechanized. The strongest evidence is the baseline
  comparison, not the green run.
- FRD-023 R3 ("a handful of lines") — met; largest single skill diff is 13 lines,
  and the two model paragraphs the `files` document said not to touch are
  untouched (verified in the diff).
- FRD-023 R5 — met.
- FRD-013 — met.
- ADR-0009 — met; Q2's answer is ADR-0009 applied.
- **ADR-0011 modified** — authorized: the ticket body asks for it by name, the
  plan's Governing-docs section declares it, and the amendment adds limits rather
  than reversing anything.
- **ADR-0014 written** — required by the ticket body, the operator's note and
  `kanmer-plan` step 3. Present, and it carries the measured table.

**Code:**
- The injection's guards are right. `in` rather than truthiness is the correct
  test for "the board said something about this boundary", and it matches the
  vacuous-list rule the neighbouring loop already follows.
- Ordering is load-bearing and is both tested (`orders the two injections…`) and
  commented.
- Keeping the two injections separate is the right call and the comment explains
  why at the length it deserves.
- The two changed collapse assertions are genuine consequence, not
  test-weakening: both now assert a *stricter* refusal (3 gates, not 2) and both
  gained the extra document rather than dropping an expectation.
- `git diff AGENTS.md` inspected: two lines added, one replaced, nothing else.
- Ripple effects from `files` followed up: both `BLOCK_BODY` copies moved
  together, `AGENTS.md` regenerated, the plugin bundle rebuilt and its provenance
  evidenced, `profileDraft.ts` checked and correctly needed nothing (no new doc
  type or pseudo-type was introduced).

**Rail:** `npm test` exit 0 (240 core / 258 GUI / 41 scripts), typecheck across
all four workspaces, `verify:agents-block` 28/28, `verify:skills` pass,
`smoke:protocol` 26/26, `smoke.mjs` 142/142, `check:manual` pass.
`kanmerGit.test.ts` flaked once under load (GUI-085, pre-existing) and is green
in the final full run.

**Upgrade safety** — the thing the operator said to stop for. Audited: the one
in-flight `fix` has not started work; the other has its report already and its
next move does not cross the new boundary. Nothing stranded, so the instruction
to stop and report does not fire.

## 4. Verdict

**Pass**, with two follow-up tickets filed (C4, C5) and three disclosed judgement
calls (C1, C2, C3) that a second reader should feel free to overturn.

Checked: the full diff, the report against it, the plan's Governing-docs section,
the four ADR/FRD refs, the rail in full, the baseline validation of the new
check, and the in-flight upgrade impact on the real board.

Not checked, and stated rather than implied: the literary quality of prose I
wrote myself, and `plugin:check`, which runs at verify on merged main.
