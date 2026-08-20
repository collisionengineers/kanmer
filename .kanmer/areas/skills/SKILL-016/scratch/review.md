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
