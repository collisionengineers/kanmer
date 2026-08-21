# Full-board completion control context

## Goal
Complete the Kanmer roadmap and leave the product with no known unfinished work. Live repository and board state are authoritative over any embedded snapshot. This horizon owns the active non-Done roster plus Done-but-incomplete tickets, and any valid remediation or review ticket discovered during execution.

## Provider-neutral milestone
Complete DOC-012, DOC-017, MCP-025, MCP-026, MCP-021, MCP-027, GUI-095, DOC-013, and MCP-028 serially through verification and closeout. The contract is one local Streamable HTTP /mcp transport with mandatory Kanmer bearer authentication, an interchangeable tunnel-adapter interface with cloudflared as one named-tunnel implementation, diagnostics that distinguish local/bearer/tunnel/DNS/remote-client failures, GUI and documentation parity, and a genuinely remote disposable-client proof with teardown. OpenAI Secure MCP Tunnel remains an independent OpenAI-managed stdio path.

## Full-board milestone
After the tunnel milestone, reconcile every Done-incomplete ticket, then process all active tickets by dependency waves and closeout. Audit all archived tickets for unresolved unique defects and audit historical Done backfill for present-day correctness without fabricating lifecycle evidence. Add and complete any valid remediation tickets.

## Fixed workflow and correctness rules
Use kanmer-tickets → kanmer-research → kanmer-plan → kanmer-execute → independent kanmer-review/merge → kanmer-verify → kanmer-closeout. Adjacent stages only; one gated boundary per move; call get_doc_gates before every move. Read every ticket document recursively using exact paths when available. Use the recorded branch/worktree for taken tickets and never force-take. Each ticket has its own worktree and branch; never edit the board worktree or .kanmer files directly. Re-read item, changed document, gates, and links immediately before writes with optimistic versions, then verify via activity/item/gates. No swallowed errors, stubs, fabricated data, speculative dependencies or scope absorption. The author never independently reviews or merges. Proof is written on merged main. All commits must be reachable, all checklist items and non-parked questions resolved, and all runtime/package/manual claims evidenced.

## Historical-ticket audit policy
The 75 named historical Done tickets are audited as backfill: read item, links, refs, body and available proof; map claimed behaviour to current code/tests; record the audit in the durable run rather than inventing plans, timestamps, branches, reviews or checklist boxes. If current behaviour fails a claim, create/link a remediation ticket and complete it. Sweep every other Done ticket for complete checklist/proof/traceability or an explicit historical disposition. Archived tickets are not assumed resolved: prove each expected disposition and restore or replace any unique unresolved defect.

## Durable-run policy
The controller writes an immutable automation/runs/<run-id>.md record and automation/current.md on this horizon before dispatch, updates and reads both around every assignment/result/stage transition, and preserves exact roster, gates, lanes, skip reasons, worker outcomes and resume instructions. Maximum three conflict-free implementation lanes; no controller auto-merge.
