# Post-implementation report — MCP-009

*The report. Not the proof — this is the author's **claim**, written before
merge; proof is **evidence**, gathered after.*

## Summary

Docs only, per the operator's accepted split. ADR-0009's staleness clause — the
instruction to re-verify provider specs "against current host documentation at
implementation time" because "skill-ecosystem facts go stale in weeks" — is
replaced by a method clause: capability claims are established against the
installed binary, never inferred from the absence of evidence, and a probe needs
a positive control *and* must verify the mechanism rather than a proxy for it.
The clause carries a worked example of its own near-miss. FRD-012's install
matrix is corrected against the measured evidence with each gap's owning ticket
named, AC2 is restated with the Antigravity workspace-binding precondition, and
R5 — which repeated the wrong lesson — now points at the amended ADR clause
instead of paraphrasing it. Two files changed, both under `docs/`. No code.

## Changes

| File | Change | Why |
|---|---|---|
| `docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md` | modified — ¶9 (Context), the staleness clause, Consequences | ¶9 asserted "Antigravity at project `<root>/.agents/skills/`" as a bare fact; it is true only in a workspace-bound session, and that is the sentence a reader quotes, so the caveat belongs inline. The staleness clause is replaced wholesale (see below). Consequences promised an upgrade for Antigravity that is currently inert, so it now says so and names MCP-015. The **Decision** — the four-layer contract hierarchy — is untouched. |
| `docs/functional/frd/FRD-012-connect.md` | modified — R2, R5, AC2, `Related:` | R2's matrix was wrong for grok and Antigravity and silent on the two marketplace names and codex's verb. R5 repeated the wrong lesson. AC2 asserted a behaviour that cannot pass today. `Related:` now routes a reader who spots the R2-vs-code gap to the owning ticket instead of a duplicate. R2a, R4 and AC5 (GUI-080, landed on main since this ticket's `files` doc was written) are preserved intact. |

Ticket documents also updated, outside the git diff: `research` (adjudication
verdict applied inline; a disposition addendum handing evidence to MCP-013/014/
015 and GUI-079), `open-questions` (all nine resolved or parked with owners),
`plan`, `checklist`.

### What the amended ADR clause actually says

1. **Establish against the binary, not the docs.** A "host X cannot do Y" claim
   is admissible only with the command run and its output; "the docs do not
   mention it" is not a finding.
2. **Prefer the host's own resolved-configuration dump** — `grok inspect`,
   `opencode debug skill`, `codex plugin list`, `claude plugin details` — over
   both documentation and narrower subcommands. Several are undocumented, and
   `grok mcp list` reports "none configured" for servers `grok inspect` shows
   active.
3. **Read a config file the tool itself wrote**, not a documented example.
4. **A probe needs a positive control** — prove it can report the capability
   present.
5. **And a positive control is not sufficient: verify the mechanism you are
   actually testing, not a proxy for it.** Worked example, this clause's own
   near-miss: a probe concluded `agy` reads no project skills directory, with a
   control that passed, and was wrong for two independent reasons. The session
   was not workspace-bound (bare `agy` binds to `default-cli-project`, record
   `"projectResources": {}`, so there is no folder and cwd is irrelevant; only
   `--new-project`, `--project <id>` with a `folderUri`, or `--add-dir <path>`
   bind — trust is not the gate, a git root does not auto-bind, project
   existence does not bind). And a workspace MCP server never surfaces as a
   named top-level tool; it appears as the generic `call_mcp_tool` /
   `list_resources` / `read_resource` triad, so grepping a tool list for the
   server's own tool name is a **false negative even when it is connected**.
6. **An unchecked CLI is a finding, never a default.**
7. **The original failure was not decay.** Stated explicitly, because the
   staleness reading is what propagated.
8. **Convergence holds and gains a third host.** One project-scoped write to
   `.agents/skills/` serves opencode, grok **and** Antigravity — making grok's
   separate `.grok/skills` write redundant — with the caveat that `agy` reads it
   only in a workspace-bound session and Kanmer binds nothing today, so the
   write is correct and inert.

## Governing docs

Both `refs` are **MODIFIED**, with explicit authorization: the ticket body
("**ADR-0009's staleness clause is amended by this ticket** … Amending a merged
ADR's reasoning is a real decision, so it is called out here rather than done
quietly") and the operator's Q3 answer in `scratch/operator-answers.md`, which
names the ADR amendment, the FRD corrections and R5 as MCP-009's three
deliverables.

- **ADR-0009 — MODIFIES.** Reasoning only. The Decision is unchanged, so no
  superseding ADR was written; ADR-0009 is `status: draft` and its decision is
  correct, and splitting one paragraph's correction across two documents would
  reproduce the very failure R5 demonstrates.
- **FRD-012 — MODIFIES.** R2/AC2 corrected to measured reality; R5 replaced by a
  reference so the rule is stated once.
- **No new ADR.** The one candidate decision — how Antigravity should be bound
  (`--add-dir` vs `--project` vs the global plugin install, which trades against
  ADR-0007's project scoping) — is **MCP-015's** to make, and this ticket must
  not pre-empt it.

**A finding was overturned mid-flight and the correction is the substance of the
change.** The research originally concluded that `.agents/skills/` does *not*
serve Antigravity and drafted an ADR clause saying so. An adjudication (ten
runs, positive controls throughout, corroborated by the probe MCP server's own
process log) established that GUI-073 was right and that conclusion was false.
That clause was **not** shipped. Had it been, it would have written a second
wrong lesson into the document this ticket exists to correct — arriving with an
evidence table, which would have made it harder to dislodge than the clause it
replaced. The research now carries the verdict inline, and the near-miss is
recorded there rather than quietly dropped.

## Risks / follow-ups

- **FRD-012 R2 now describes an end state shipped code does not meet.** Deliberate,
  and every divergence names its owner in the same sentence: **MCP-013**
  (marketplace root, packaging both marketplace manifests, the swallowed
  non-zero exit at `connect.ts:152`, the two marketplace names, the two
  `${…}_ROOT` variables), **MCP-014** (grok → plugin), **MCP-015** (Antigravity
  binding + dispatch), **GUI-079** (`.mcp.json` collision, in flight),
  **MCP-011** (both manifests frozen at `0.1.0`). None touched here.
- **AC2 cannot pass for Antigravity until MCP-015 lands.** Stated in the FRD as
  the end state with the dependency named, rather than left as an acceptance
  criterion that silently fails.
- **Pre-existing flaky test, unrelated to this diff.**
  `apps/gui/src/main/kanmerGit.test.ts` fails non-deterministically on Windows
  with `EPERM` in its `afterEach` `rmSync` of a temp git worktree: run 1 failed
  two tests, run 2 failed one *different* test, and all 7 pass in isolation. The
  file is not in this diff. Flagged for the operator; no ticket filed, as filing
  is outside this ticket's docs-only scope.
- **`providers.ts` line numbers cited in `research` have drifted** (the `agy -p`
  comment is now at :451, cited as :386). The successor tickets should search by
  string rather than line.
- **The amended clause is longer than the paragraph it replaced**, which is a
  real cost — a rule nobody reads is not a rule. Mitigated by keeping the ADR's
  dense-paragraph register and by stating the sharp form in one quotable
  sentence.

## Verification hand-off

On merged `main`:

1. `npm run build` **first** — a fresh checkout has no `packages/core/dist`, and
   `npm run typecheck` fails with `TS2305` on `@kanmer/core` exports until it
   exists. Not a regression; `npm run setup` chains them for this reason.
2. `npm run typecheck` — expect clean across all four workspaces.
3. `npm test` — expect `@kanmer/core` 193/193. `@kanmer/gui` may show 1–2
   failures in `kanmerGit.test.ts` from the Windows `EPERM` flake above; re-run
   that file alone to confirm it passes in isolation.
4. `npm run check:manual` — expect `manual: up to date (12 chapters)`. FRD-012 is
   **not** among the nine curated FRDs in `scripts/build-manual.mjs` (`FROM_FRD`
   lists 002, 007, 003, 001, 006, 004, 011, 010, 020 — read, not assumed), so
   `chapters.generated.ts` needs no regeneration. A failure here would mean that
   premise was wrong.
5. `git diff --stat <merge-base>..HEAD` — expect only the two `docs/` paths. Any
   other path is a scope violation and the reason this check is in the proof.
6. `grep -rn "go stale in weeks\|current host documentation" docs/` — expect
   nothing. `grep -rn "current host docs" docs/` returns exactly **one** hit: the
   retired phrase quoted inside FRD-012 R5 as the wrong lesson being retired.
   That hit is intended; a *second* hit, or any unquoted normative use, is not.
7. Read back ADR-0009's method clause and FRD-012 R2/R5/AC2 from merged `main`,
   so the proof carries the shipped text rather than a claim about it.

No UI, no screenshots, no behaviour to observe — the deliverable is prose, and
the check that matters is that the prose says the right thing and that nothing
else moved.
