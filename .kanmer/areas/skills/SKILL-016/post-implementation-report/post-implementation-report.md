# Post-implementation report — SKILL-016

## Delivered

- Converted `kanmer-auto` from area/ad-hoc batch selection to one explicit existing epic or horizon per run, with an optional area filter inside that group.
- Added a durable, resumable group-document contract: `automation/current.md` points to immutable `automation/runs/<run-id>.md` history, including schema, run/controller/project identity, status, lane cap, stop reason, selection, invariants, ledger, events, and resume instruction.
- Defined startup validation/resume/refusal behaviour, ordered write/readback before dispatch, reconciliation after results and on restart, terminal history retention, and an explicit no-new-MCP/no-auto-merge boundary.
- Added run and pointer templates, canonical prose-validator assertions, and a disposable three-ticket interruption/resume scenario covering history retention plus wrong-project and other-controller refusal.

## Files changed

- `plugins/kanmer/skills/kanmer-auto/SKILL.md`
- `plugins/kanmer/skills/kanmer-auto/assets/run-state-template.md`
- `plugins/kanmer/skills/kanmer-auto/assets/current-run-template.md`
- `scripts/verify-skill-prose.mjs`
- `scripts/auto-run-state.test.mjs`

## Validation

- PASS — `npm run verify:skills`
- PASS — `node --test scripts/auto-run-state.test.mjs`
- PASS — `npm run test` (255 core tests, GUI suite, and 55 script tests).
- PASS — `git diff --check`.
- BLOCKED outside this ticket — `npm run typecheck` fails on the current base in `apps/gui/src/renderer/src/components/Editor.tsx` (`TicketDocsInfo.scratch` and an implicit `slug`) and `packages/ui/src/demo.tsx` (missing `documentPaths`). SKILL-016 changes no TypeScript production/UI files.

## Traceability

- Commit: `752ef7d3db5a1315aad14acba2a21f28121e7575` (`feat(auto): persist group run state`).

## Review focus

Confirm that the skill is intentionally group-owned, writes history before the current pointer, reconciles without replay, preserves immutable runs, and does not create MCP surface or automatic merge authority.

## Review remediation — SKILL-028

Replaced the raw temporary-file scenario with scripts/auto-run-state.test.mjs using a disposable KanmerStore board. It creates a real horizon and two grouped tickets, writes and reads automation/runs/<id>.md and automation/current.md through setGroupDoc/getGroupDoc, performs an independent live moveItem, checks derived activity, then writes a reconciled paused ledger and proves activity has not gained a second move (no replay). A later run is written at a distinct group-document path while the original history remains readable. This runs through Kanmer's actual paths, group-doc atomic-write/read behavior, ticket/group membership, move gates, and activity log—not raw local files.

Validation after remediation: npm run build:core; node --test scripts/auto-run-state.test.mjs (1/1); npm run verify:skills; git diff --check.

Commits: 9b2d574, f6adae2.

## Second review remediation — SKILL-028

The disposable real-board scenario now parses and reads the stored current pointer and referenced run record through KanmerStore before deciding resume/refusal. It writes a wrong-project run/pointer and a running foreign-controller pointer, snapshots current/history, the live ticket, and its activity, then proves each decision refuses with byte-for-byte unchanged snapshots. It restores the valid pointer and proves normal resume, still without replaying the live transition. Commit 4d963c5; targeted scenario and verify:skills pass.
