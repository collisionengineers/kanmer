# Open questions

> **Closed by abandonment, 2026-08-16, on the operator's decision.**
>
> This ticket is archived and **nothing was implemented** — verified: there is no
> `child_process` anywhere in `packages/core/src`, so the git-backed precondition
> does not exist in any form. The four questions below were never answered; they
> are recorded as closed so this document stops reading as live work.
>
> | # | Question | Disposition |
> |---|---|---|
> | 1 | Review → rework with the PR still open: blocked or allowed? | Moot — the rule it exempts was never built. |
> | 2 | May `@kanmer/core` shell out to git? | **Unanswered and will recur.** Wanted its own ADR; no ADR was written. The next feature needing process state inherits this question cold. |
> | 3 | Two git spawns per drag — acceptable, or does the check move? | Moot. Also the only question on this board that was posed with *no* recommended answer, because it depended on timing nobody measured. |
> | 4 | Should the precondition appear in `get_doc_gates`? | Moot. |
>
> **Why it stays dead.** The concern behind this ticket — gates cannot tell that
> the thinking preceded the work — is real, but it is addressed more cheaply
> elsewhere. `collapsesPipeline` (`gates.ts:186`) already refuses a move that
> crosses more than one gated boundary, structurally and without touching git,
> and [[SKILL-012]] takes the same concern further by requiring open questions to
> be resolved before a boundary is crossed. Neither needs a subprocess in a
> package that is bundled into the shipped MCP server.
>
> **What reopens it.** A demonstrated case that survives both of those — work
> whose documents were written after the code despite one-boundary-per-move and
> resolved questions. None has been observed.
>
> Everything below is the original text, unchanged.

---

Four for you. Everything else is decided and recorded below so it is not
re-litigated at planning time.

## 1. Review → rework, PR still open: blocked or allowed?

Measured: once a branch's commits merge into the base they stop being unique to
it, so a ticket re-opened **after** its PR merged is unblocked automatically. No
exemption needed for that shape.

Still blocked: review asks for changes, the ticket returns to Preparing, its PR
is open and commits unmerged. It cannot leave Preparing again until it merges.

**Recommendation: exempt a ticket that has been past Preparing before**
(`stageEntered.implementing` is set). The rule's purpose is the *first* entry
into implementation; it should say nothing about later laps. Blocking here makes
the ordinary rework loop impossible and is how a rule gets routed around.

## 2. May `@kanmer/core` shell out to git?

Confirmed: it does not today — no `child_process` anywhere in `packages/core/src`,
and deps are chokidar / gray-matter / yaml / zod. This introduces the first
subprocess, in a package bundled into the shipped MCP server.

**Recommendation: yes, with every failure degrading to _allow_.** A gate that
refuses because git was missing or slow is worse than the hole it closes.
`smoke.mjs:206` already exercises the non-git path and will catch a regression.

Worth **its own ADR** rather than a line in FRD-002 — it is the architecturally
novel part of this change.

## 3. Two git spawns per drag — acceptable, or does the check need to move?

A positioned move gates twice (`assertMoveAllowed` pre-flight, then
`updateItem`), and **every GUI drag passes a position**. So each drag onto a
column past Preparing spawns git twice on the Electron main thread.

Options: accept it; cache the answer for the duration of one `moveItem`; or run
the check only in `updateItem` and let the pre-flight skip it — which costs the
"a refused positioned move writes nothing" guarantee that `assertMoveAllowed`
exists to provide.

No recommendation. It is a real trade and depends on how slow git actually is on
your machine with a cold cache, which I have not measured under a drag.

## 4. Should the precondition appear in `get_doc_gates`?

If it does, the GUI can grey the drop target and skills can self-check — ADR-0009
says derive, never restate. If it does not, the first sign is a refused move.

Cost: `get_doc_gates` becomes a git-touching call, and it is polled by the GUI
readiness panel. That is a much higher call rate than moves.

**Leaning no** — surface it in the refusal message only, at least initially.

---

# Decided — recorded so planning does not revisit them

- **The formulation.** Commits unique to the branch:
  `git rev-list --count <branch> --not <every other ref>`. Base-free, measured
  correct across seven scenarios. The ticket's original
  `rev-list --count <branch>` returns **147** on a fresh branch here and would
  refuse everything.
- **No base branch is recorded or needed.** A `<base>..<branch>` form would have
  misfired on this repo, where every ticket was cut from
  `v3-phase-minus-1-prework` rather than `main`.
- **Where it runs:** `paths.repoRoot`. Not because the board worktree sees the
  wrong graph — measured, it sees the right one; worktrees share refs even
  though the board branch is orphan — but because a board kept outside the code
  repo would otherwise be queried for branches it does not have.
- **It is a precondition, not a profile requirement.** `spike` declares no
  `leave-preparing` requirement, so a profile-expressed rule would silently skip
  spikes. It sits beside the collapse check, outside `requirementsFor` and
  outside the `EvidenceProbe`.
- **Where in `assertDocGate`:** after `firstBlocking` returns clean. The pure
  rejections are cheap; a subprocess must not run on a move already refused.
- **`take_ticket` is safe as written** — it defaults to `stage: "implementing"`
  so it *is* a leave-preparing move, but it passes `current`, whose `branch` is
  still the old one. Depends on that line staying as it is; the plan should say
  so and the call site should carry a comment.
- **No branch recorded / branch missing / not a git repo** → no-op, allow.
- **Uncommitted work is invisible.** The rule counts commits. Closing that means
  core inspecting working-tree state — a much larger change, out of scope.
- **All of this proves sequence, not causation.** A plan written first and then
  ignored passes. The amendment must say so; a gate that claims more than it
  delivers is one people learn to route around.
