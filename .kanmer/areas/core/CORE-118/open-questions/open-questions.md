# Open questions — CORE-118

- [x] **Does FRD-033 fit in one reviewable PR, or must it split?** — Resolved:
      split. Acceptance 1–3 (plan validation + versioned step-packet
      compilation) stay here; acceptance 4 (a controller detecting
      forbidden-file changes, stale document versions and plan deviation after
      a worker returns) moved to **[[CORE-127]]**, linked with `blocks` from
      this ticket. Recommendation and reason: detection needs Git observation of
      the recorded workspace and belongs with the read-only `reconcile_ticket`
      inspector (CORE-122), whereas compilation is pure and board-local; keeping
      both would put two subsystems and two evidence models in one diff. The
      controller's lane brief pre-authorised this split.
- [x] **Does plan validation *reject* vague language, or only flag it?** —
      Resolved: flag. FRD-033 says "rejects **or flags**" and acceptance 2 says
      it "identifies"; the shipped plan template and `kanmer-plan` both state
      the decision-verb warning "is not a gate or regex score", and
      `scripts/verify-skill-prose.mjs:347-348` pins that sentence. Vague-language
      and risk-evidence findings are therefore **advisory** and always reported;
      only structural absence (no compilable step, undeclared allowed file, no
      tests, no done condition, no acceptance check, stale recorded evidence)
      **blocks**, and only in the new step-scoped mode.
- [x] **New tool, or a mode on `get_execution_packet`?** — Resolved: an optional
      `step` parameter on `get_execution_packet`. The roster stays 39 (pinned by
      `smoke.mjs:69`, `smoke-protocol.mjs:160`, AGENTS §4, `docs/manual/connect.md`
      and the tool reference), the call stays `readOnlyHint: true`, and the new
      refusal is appended after every existing one so the documented precedence
      is extended rather than reordered.
- [x] **Does the strict plan contract apply to today's whole-ticket packet?** —
      Resolved: no. Existing plans (including every plan on this board) keep
      working exactly as they do now and merely gain an advisory `validation`
      block. The strict contract applies only when a caller asks for a `step`,
      which is the "unattended execution" acceptance 1 actually governs.
- [x] **Does this need a board format bump or new frontmatter?** — Resolved: no.
      Compilation reads existing documents and computes versions with
      `contentVersion`; nothing is persisted. The live board stays readable by
      the installed v0.3.12 server, and `store.ts` is not touched — which also
      keeps this lane clear of the concurrent CORE-125 locking work.

## Parked (explicitly deferred)

- Persisting a compiled step packet as a ticket document, and the
  dispatch/return loop that consumes one — [[SKILL-036]].
- A GUI surface for validation findings — no ticket yet; raise after
  [[CORE-127]] settles the finding vocabulary.
