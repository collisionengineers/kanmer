## Review — MCP-009 / PR #44 — 2026-08-16

**I am both author and reviewer of this change. This is not an independent
review and should not be read as one.** What follows is a self-check against the
diff, the report and the governing docs, with the points I would have raised
against someone else's PR.

### Changes (reviewer's own reading of the diff)

`docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md` — three edits.
The Context paragraph re-dates the host survey to the binary check and adds the
workspace-binding caveat to the Antigravity clause, and it replaces "research
that had gone stale" with "research that nobody had checked". The single
staleness sentence in Decision becomes four paragraphs under a new `### Method`
sub-heading: the standard of evidence, the verify-the-mechanism rule with the
`agy` worked example, an explicit statement that the original failure was not
decay, and the corrected convergence note. Consequences gains the inert-until-
MCP-015 caveat and a sentence naming the cost the method clause imposes.

`docs/functional/frd/FRD-012-connect.md` — R2 becomes a per-host bulleted matrix
with an owning ticket against each divergence; R4's shared-directory parenthetical
is widened (see comment 1); R5 becomes a reference to the ADR clause rather than
a paraphrase; AC2 gains the binding precondition and specifies the check as
invoking the skill and calling the tool; the `Related:` line gains an open-work
list. R2a and AC5 (GUI-080) are untouched.

Diff is two files, both under `docs/`. No code, no tests, no build artifacts.

### Comments

1. **BLOCKING (fixed in PR) — R2 and R4 contradicted each other after the R2
   correction.** R2 now establishes that `.agents/skills/` serves three hosts,
   while R4 still read "Where one directory serves two hosts (`.agents/skills` —
   opencode and Antigravity)". Left alone, the FRD would state a host count two
   different ways in adjacent requirements, and R4's disconnect-retention rule —
   keyed on whether *a host writing that directory* is still registered — would
   under-count if grok later joins them. This was introduced by my own R2 edit
   and is exactly the class of defect the ticket exists to stop: a stale
   statement left standing beside a corrected one. Widened to "more than one
   host … and grok as well if MCP-014 retires its redundant separate
   `.grok/skills` write, per R2", with "any host" for the retention clause.
   Deliberately conditional: whether grok moves is **MCP-014's** decision, and
   R4 must not pre-empt it.

2. **NON-BLOCKING (accepted, with reason) — `### Method` is the only `###`
   sub-heading in any ADR.** Verified: `grep -c "^### " docs/architecture/adr/*.md`
   matches ADR-0009 alone; the house skeleton is `## Context` / `## Decision` /
   `## Alternatives considered` / `## Consequences`, with one precedent for an
   extra `##` section. Keeping it. Three separate places now cite "ADR-0009's
   method clause" by name — FRD-012 R5, the ADR's own Consequences paragraph and
   R2 — and a named cross-reference to an unnamed paragraph is the kind of
   almost-findable pointer that decays into a paraphrase, which is precisely how
   the wrong lesson spread. A findable anchor is worth the one deviation.

3. **NON-BLOCKING (accepted) — the amended clause is materially longer than what
   it replaced**, one sentence to four paragraphs. Weighed and accepted: the
   worked example is the part that does the work, since the abstract rule
   ("needs a positive control") was already present in the research and still
   let a wrong conclusion through. The sharp form is stated in one quotable
   sentence for readers who take only that.

4. **NON-BLOCKING (filed, not fixed) — R2 describes an end state shipped code
   does not meet.** Intentional and the point of the ticket, but it does mean a
   reader diffing R2 against `providers.ts` finds five discrepancies. Mitigated
   by naming the owning ticket inline on every one and by the `Related:`
   open-work list. Owners: MCP-013, MCP-014, MCP-015, GUI-079, MCP-011.

5. **NON-BLOCKING (reported, not filed) — pre-existing flaky test.**
   `apps/gui/src/main/kanmerGit.test.ts` fails non-deterministically on Windows
   with `EPERM` in `afterEach`'s `rmSync` of a temp git worktree — two failures
   on run 1, one *different* failure on run 2, all 7 pass in isolation. Not in
   this diff and not caused by it. Not filed as a ticket because filing is
   outside this ticket's docs-only scope; surfaced to the operator instead.

6. **NON-BLOCKING (verified, not taken on trust) — the binding claim.** The
   adjudication asserts Kanmer establishes no `agy` workspace binding, and the
   ADR now states that as fact. Re-ran it rather than inheriting it:
   `grep -rn -- "--new-project\|--add-dir\|--project" apps/ packages/` returns
   nothing; the only `agy` string in either tree is a stale comment at
   `providers.ts:451`. Confirmed. Shipping an unverified claim inside the clause
   that forbids unverified claims would have been self-refuting.

### Check: report against diff

The post-implementation report's Changes table lists both files with rationales
that match what the diff does; nothing in the diff is unlisted, and nothing
listed is absent. The report's eight-point summary of the amended clause matches
the shipped text point for point. The report predates the R4 fix in comment 1
above — that fix is recorded here rather than retro-fitted into the report,
since the report is the author's pre-merge claim and this is the reviewer's
addition to it.

### Check: governing docs

The plan's Governing-docs section claims both refs are **MODIFIED** under
explicit authorization. Holds: the ticket body authorizes the ADR amendment in
terms ("**ADR-0009's staleness clause is amended by this ticket**"), and
`scratch/operator-answers.md` Q3 names all three deliverables. Each shipped.
ADR-0009's **Decision** — the four-layer contract hierarchy — is untouched by
the diff, as the plan promised, so no superseding ADR was owed. No new ADR was
written, correctly: the one live design decision (how Antigravity should be
bound, which trades against ADR-0007's project scoping) is MCP-015's to make and
is named as such rather than pre-empted.

Scope contract holds: `git diff --stat origin/main` is two `docs/` paths.

### Check: the content

The substantive risk on a docs change is that the prose is wrong, and one claim
in it was wrong until the adjudication caught it. Confirmed the shipped text does
**not** contain the retracted clause: `.agents/skills/` is stated to serve
Antigravity, not to exclude it, and the convergence claim is presented as holding
and gaining a third host. The negative grep for the retired lesson returns one
hit — the phrase quoted inside R5 as the thing being retired — which is intended;
any unquoted normative use would not be.

Ripple effects from the `files` document were followed: R2a/R4/AC5 from GUI-080
were preserved (the worktree copy was ahead of the main checkout and was the one
edited), FRD-012 was confirmed absent from `build-manual.mjs`'s `FROM_FRD` so no
generated chapter needed regenerating, and the GUI-073 / MCP-011 / GUI-080
boundaries were referenced without being edited.

### Verdict

**PASS**, with comment 1 fixed in the PR and comments 4–5 recorded rather than
resolved. Checked: the diff against the report, the plan's Governing-docs section
against both refs, the shipped text against the adjudication verdict, the scope
contract, and the rail (`typecheck` clean, `check:manual` clean at 12 chapters,
`@kanmer/core` 193/193, one pre-existing unrelated flake). Merging and moving to
Verifying under the operator's standing delegation.

Weakest point, stated plainly since no independent reviewer will: this change is
prose asserting facts about five external binaries, and its correctness rests on
a research document that was demonstrably wrong once already and on an
adjudication I did not run myself. I re-verified the one claim I could re-verify
locally (comment 6). The rest — the ten-run measurement, the process log — is
inherited evidence, and the clause is written to say so rather than to imply I
saw it.
