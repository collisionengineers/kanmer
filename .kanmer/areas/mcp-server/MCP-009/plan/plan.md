# Plan — MCP-009: Provider-parity documentation corrections (docs only)

*The plan. Not the checklist — this is the **reasoning**; the checklist is the
executable distillation of it.*

Written FROM `research` and `files`, as amended by `scratch/operator-answers.md`
(2026-08-16, the split accepted) and `scratch/adjudication.md` (2026-08-16, the
Antigravity conclusion overturned). Where the research and the adjudication
disagree, **the adjudication governs**.

## Scope, as settled by the operator

MCP-009 is now **docs only**. Three deliverables:

1. **ADR-0009 ¶19** — replace the staleness clause with the absence-of-evidence
   rule and the check-the-binary method, plus the verify-the-mechanism worked
   example from the adjudication, plus the corrected convergence note.
2. **FRD-012** — correct R2's install matrix and AC2 against the evidence.
3. **FRD-012 R5** — it repeats the same wrong lesson; replace it with a pointer
   to the amended ADR clause so the rule is stated once.

Explicitly **not** this ticket, referenced only: **MCP-013** (marketplace root,
packaging, the swallowed non-zero exit at `connect.ts:152`, the two marketplace
names, the two `${…}_ROOT` variables), **MCP-014** (grok → plugin), **MCP-015**
(Antigravity → plugin + dispatch, and the binding that makes the `.agents/`
write live), **GUI-079** (the `.mcp.json` collision, already in flight),
**MCP-011** (the frozen `0.1.0`), **GUI-080** (pruning), **GUI-073** (the
`register-only` label). No file under `apps/` or `packages/` is touched.

## Profile

`get_doc_gates MCP-009` reports `feature`: research + files + plan + checklist +
questions-resolved to leave Preparing, a post-implementation report to enter
Review, proof to enter Done. **Keeping `feature`.** Every one of those gates
earns its place here even though no code ships — amending a *merged* ADR's
reasoning is precisely the kind of decision that should carry a plan, a review
and a proof, and the ticket body calls that out ("Amending a merged ADR's
reasoning is a real decision, so it is called out here rather than done
quietly"). Downgrading to `chore` would drop the post-implementation report and
the proof on the one change whose whole risk is *being wrong in an authoritative
document*. No gate is being dodged and no document nobody needs is being
written.

## Approach

Correct the two documents in place, in one commit each concern, and let the
research document carry the evidence rather than duplicating command transcripts
into the governing docs. The alternative — a new ADR superseding ADR-0009 —
was rejected: ADR-0009 is `status: draft`, its *decision* (the contract
hierarchy) is unchanged and correct, and only its final paragraph's **reasoning**
is wrong. Superseding a draft ADR to fix one paragraph would scatter the rule
across two documents, which is the failure mode R5 already demonstrates.

The second choice is what the amended clause *says*. The research drafted a
clause asserting `.agents/skills/` serves opencode and grok but **not**
Antigravity. The adjudication overturned that by measurement (ten runs, positive
controls throughout, corroborated by the probe MCP server's own process log), so
that sentence is not shipped. ADR-0009's convergence claim **holds**; it gains a
third host (grok) and one caveat (Antigravity reads the tree only in a
workspace-bound session, and Kanmer binds nothing today).

The third choice is how much of the trap to write down. The adjudication's
finding — that a workspace MCP server surfaces as the generic `call_mcp_tool` /
`list_resources` / `read_resource` triad rather than under its own tool name, so
a tool-list grep is a false negative even when the server is connected — is
included as a **worked example inside the clause**, not as a footnote. It is the
sharper half of the lesson: the research's rule already demanded a positive
control, and this case had one that passed while the probe still misread. The
rule that would have caught it is *verify the mechanism you are actually
testing, not a proxy for it*.

## Governing docs

Both refs are **Modified**, with explicit operator authorization recorded in
`scratch/operator-answers.md` (Q3: "MCP-009 keeps the DOCS only", naming the
ADR-0009 amendment, the FRD-012 corrections and R5 as the deliverables) and in
the ticket body ("**ADR-0009's staleness clause is amended by this ticket**").

- **`docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md` — MODIFIES.**
  - ¶19 (the staleness clause) is replaced wholesale. What changes: the
    instruction to "re-verify against current host documentation … skill-
    ecosystem facts go stale in weeks" becomes (a) capability claims are
    established against the installed binary and never inferred from absence of
    evidence, (b) prefer each host's own resolved-configuration dump, (c) read a
    config file the tool itself wrote, (d) a probe needs a positive control,
    (e) **and a positive control is not sufficient — verify the mechanism, not a
    proxy**, with the `agy` workspace-binding / `call_mcp_tool` case as the
    worked example, (f) an unchecked CLI is a finding, never a default, (g) the
    explicit correction that the original failure was *not* decay, and (h) the
    convergence note, corrected to three hosts with the Antigravity binding
    caveat.
  - ¶9 (Context) gains the same binding caveat inline, because it is the
    sentence that asserts "Antigravity at project `<root>/.agents/skills/`" as a
    bare fact and is the line a reader quotes.
  - The **Decision** (the four-layer contract hierarchy) is untouched. The
    Consequences paragraph gains one clause noting the Antigravity install is
    currently inert pending MCP-015, since it currently promises an upgrade that
    does not yet take effect.
- **`docs/functional/frd/FRD-012-connect.md` — MODIFIES.**
  - **R2** install matrix: corrected to what was measured — `.agents/skills/`
    serves opencode, grok **and** Antigravity (grok is a third host the matrix
    never mentioned); Antigravity's read is gated on a bound workspace folder
    and Kanmer binds nothing today (MCP-015); Claude and codex go by marketplace
    but the shipped commands are wrong today (MCP-013), and codex's verb is
    `plugin add` against marketplace `kanmer-plugins`, not `plugin install`
    against `kanmer`; grok can take the plugin outright (MCP-014); opencode is
    the only host with no plugin installer at all and genuinely needs the copy.
  - **AC2** ("both discover the roster from one `.agents/skills/` tree"):
    unsatisfiable as written *today*, not because the tree is wrong but because
    the Antigravity session Kanmer never binds cannot read it. Restated so it is
    testable, with the binding precondition named and MCP-015 recorded as the
    owner of making it pass.
  - **R5** ("Provider facts are re-verified against current host docs at
    implementation time") is replaced by a pointer to the amended ADR-0009
    clause. One statement of the rule, in the document with the authority.
  - A `Related:` line addition recording MCP-013/014/015 and GUI-079 as the
    owners of the code-side corrections this FRD now describes, so a reader who
    spots the gap between the matrix and `providers.ts` finds the ticket instead
    of filing a duplicate.
- The research document is updated first (Step 1) so the evidence base the two
  governing docs cite is itself correct — shipping an amended ADR that cites a
  research doc still carrying the overturned conclusion would leave the wrong
  lesson one hop away.

## Steps

1. **Amend `research` for the adjudication.** Add a superseding section at the
   head of Finding 4c and correct the Antigravity column of Finding 5's table
   and the §"What this implies" bullets, so no reader of the research meets the
   overturned conclusion without the verdict attached. Record, in the research,
   the findings that belong to MCP-013/014/015 and GUI-079 so those tickets
   inherit the evidence: the workspace-binding gate and its three non-gates
   (trust, git root, project existence) for MCP-015; the `call_mcp_tool` triad
   as a general probing hazard; and a pointer noting the marketplace-root and
   `.mcp.json` findings are filed.
2. **Replace ADR-0009 ¶19** with the amended clause, in the ADR's own dense
   prose register. Add the binding caveat to ¶9 and the inert-until-MCP-015
   clause to Consequences.
3. **Correct FRD-012 R2 and AC2** against the evidence, naming the owning
   tickets for each gap between the matrix and shipped behaviour.
4. **Replace FRD-012 R5** with a pointer to the amended ADR-0009 clause, and
   extend the `Related:` line.
5. **Run the rail**: `npm test`, `npm run typecheck`, `npm run check:manual`.
   FRD-012 is **not** one of the nine curated FRDs in `scripts/build-manual.mjs`
   (`FROM_FRD` lists 002, 007, 003, 001, 006, 004, 011, 010, 020 — verified by
   reading the file, not assumed), so `chapters.generated.ts` does **not** need
   regenerating and `check:manual` should be clean. If it is not, that is a
   finding to stop on.
6. **Post-implementation report, PR, review, merge, proof, closeout.**

## Verification

`proof.md` is produced from, on merged `main`:

- `npm test`, `npm run typecheck`, `npm run check:manual` — all three green.
  The rail cannot regress on a docs-only diff, so its value here is to prove
  exactly that: that the diff touched nothing the build reads. A `check:manual`
  failure would mean FRD-012 *is* curated after all and the plan's premise was
  wrong.
- `git diff --stat` on the merge showing only `docs/**` paths, which is the
  scope contract for this ticket in one line.
- The amended ADR-0009 ¶19 and FRD-012 R2/R5/AC2 read back from merged `main`,
  so the proof carries the shipped text rather than a claim about it.
- A negative check: `grep -rn "go stale in weeks\|current host documentation\|
  current host docs" docs/` returns nothing, proving the wrong lesson does not
  survive anywhere in `docs/` — the specific failure this ticket exists to fix
  was that the wrong lesson had *propagated*, so proving it is gone from both
  places matters more than proving either one changed.

## Risks / open questions

- **Risk: writing a second wrong lesson into the document that exists to correct
  a wrong lesson.** This nearly happened — the drafted clause asserting
  Antigravity does not read `.agents/skills/` was false, and would have arrived
  carrying an evidence table. *Mitigation:* the adjudication governs over the
  research wherever they differ; Step 1 corrects the research before the ADR
  cites it, so the two cannot drift apart again.
- **Risk: the amended clause is longer than the paragraph it replaces**, and a
  rule nobody reads is not a rule. *Mitigation:* keep the ADR's dense-paragraph
  register, put the worked example inside the clause rather than in an appendix,
  and state the sharp form of the rule ("verify the mechanism, not a proxy") in
  one sentence a reader can quote.
- **Risk: FRD-012's matrix describes an end state that shipped code does not
  meet**, so a reader concludes the FRD is wrong rather than the code. *
  Mitigation:* every gap in the corrected matrix names its owning ticket
  (MCP-013/014/015, GUI-079) in the same sentence.
- **Risk: overstepping into a filed ticket's scope.** *Mitigation:* the diff is
  restricted to `docs/architecture/adr/` and `docs/functional/frd/`; a
  `git diff --stat` showing any other path is a review failure, and it is in
  the proof for that reason.
- **No open questions remain.** Q1/Q2 were settled by the adjudication, Q3/Q4/Q5
  by the operator, and Q6-Q9 belong to MCP-013, MCP-011 and GUI-080 — they are
  moved to Parked with their owners named rather than ticked, since they are
  real questions that this ticket is simply not the place to answer.
