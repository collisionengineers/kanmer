# Independent review — SKILL-016 / PR #92

## Scope reviewed

- kanmer-auto/SKILL.md makes auto runs group-owned, persists automation/current.md plus immutable automation/runs/<run-id>.md, orders history write/readback before pointer write/readback, and requires live-board reconciliation before re-dispatch.
- The two templates contain the promised schema, pointer path, ledger/event/resume headings, and no-auto-merge boundary.
- verify-skill-prose.mjs adds a narrow durable-run contract rail, and auto-run-state.test.mjs adds a three-ticket interruption/resume-shaped test.

## Independent checks

- PASS — PR #92 is open, clean, one commit, and changes exactly the five planned skill/template/validator/scenario files. No MCP surface, plugin bundle, package, or workflow change is included.
- PASS — plan/report/diff align on group ownership, record-before-pointer ordering, readback, live-state reconciliation, history retention, and no automatic merge; this conforms to FRD-023 and EPIC-009's weak-agent/no-new-engine constraint.
- PASS — npm run verify:skills, including the new durable-run rail.
- PASS — node --test scripts/auto-run-state.test.mjs.
- PASS — git diff --check origin/main...HEAD.

## Blocking finding

1. **Blocking — the claimed disposable Kanmer-run proof is only a raw filesystem model.** auto-run-state.test.mjs creates a temporary directory and writes .kanmer/groups/HZN-016/automation/*.md using fs.writeFile; its resume decision is a test-local helper. It never creates/reads a disposable Kanmer board/group through the real store or MCP group-document surface, never calls set_group_doc/get_group_doc, and never exercises live tickets/gates/activity reconciliation. This falls short of the ticket's explicit verification requirement to run a disposable multi-ticket Kanmer scenario and resume solely from Kanmer reads.

## Disposition

- Filed [[SKILL-028]] as a blocking review ticket, linked SKILL-028 blocks SKILL-016. It must replace or supplement the model with a real disposable-board/group-document scenario covering history-before-pointer, interruption/fresh resume, independent live change/no replay, wrong-project and other-controller refusal without mutation, and second-run history retention.
- No merge performed.

## Verdict

**NEEDS CHANGES** — PR #92 remains in Review pending [[SKILL-028]].

SKILL-028 remediation: replaced raw temp-file proof with a disposable real KanmerStore board/group-document/ticket/activity scenario. Commits 9b2d574 and f6adae2 pushed to PR #92; targeted test and verify:skills pass. Ticket remains Review.

## Re-review — remediation still incomplete

The new disposable KanmerStore scenario is a material improvement: it writes/reads the real group-document paths, moves a live ticket, observes activity, avoids a second move, and retains a second run.

However, its “Mismatch/foreign-owner decisions” block only re-reads the same valid current pointer. It never supplies a mismatched project fingerprint or a running record owned by another controller, invokes a refusal decision, or proves those cases leave group documents/ticket/activity unchanged. The ticket plan/checklist explicitly require both refusals without mutation.

**Verdict: NEEDS CHANGES.** Keep [[SKILL-028]] blocking SKILL-016; add explicit real-board wrong-project and foreign-controller records plus refusal assertions and no-mutation snapshots, then request re-review.

Second SKILL-028 remediation pushed: 4d963c5 proves wrong-project and foreign-running-controller decisions read real stored group documents and reject without group-doc/ticket/activity mutation. Targeted test + verify:skills pass; remains Review.

## Re-review — PASS

SKILL-028 is now satisfied. The disposable real KanmerStore scenario writes/reads the actual group run and pointer paths, observes a live ticket move/activity, proves no replay, retains history, and explicitly tests wrong-project plus foreign-running-controller refusal with unchanged group docs, ticket, and activity snapshots. Targeted scenario 1/1, `npm run verify:skills`, and `git diff --check` pass.

**Verdict: PASS.** Merge PR #92 and move SKILL-016 to Verifying; do not write proof until merged main.
