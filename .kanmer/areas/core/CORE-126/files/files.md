# Files — CORE-126

## Where the change lands

| Path | Why |
|---|---|
| packages/core/src/types.ts | Add the optional durable batch-controller field, strict persistent batch-manifest/result shapes, and roster-aware merge-gate evidence/result types. All item fields stay additive. |
| packages/core/src/frontmatter.ts | Keep the new batch-controller field in the canonical lease/batch key order. |
| packages/core/src/paths.ts | Name the path-confined persistent batch-manifest directory; stable v0.3.12 item scans remain untouched. |
| packages/core/src/store.ts | Enforce the real batch actor; transact declaration plus first take; retain/recover the authoritative manifest under withLeaseLock; guard conflicting pending mutations and member deletion; report manifest-driven state; and require every original member terminal before release. |
| packages/core/src/claims.test.ts | Failing-first and regression cases for actor mismatch, force-retaken declaration, every manifest/member/taker interruption boundary, exact and conflicting recovery, changed take intent, malformed manifest, concurrent mutation/deletion, missing members, partial release recovery, complete terminal cleanup, and unchanged isolated batches. |
| packages/core/src/merge-gate.ts | Resolve a normalized explicit footer roster; validate that a multi-ticket roster exactly equals one complete frozen batch; aggregate every member's stage, question, dependency, target, PR/head attestation, commit and board-sync verdict while preserving the single-ticket result. |
| packages/core/src/merge-gate.test.ts | Valid three-member batch and incomplete, superset, mixed, unbatched, pending/corrupt, wrong-stage, archived, open-question, blocker, wrong-PR/head and missing/invalid review cases; unchanged single-ticket behavior. |
| packages/mcp-server/src/check-pr.mjs | Collect phase-2 evidence for every resolved roster member from one board snapshot and emit one protected verdict. |
| packages/mcp-server/src/check-pr.test.mjs | Exercise the real CLI with a valid three-member batch and decisive roster/member failures under strict mode. |
| packages/mcp-server/src/index.ts | Pass the actual MCP actor into takeTicket and expose batch id, controller and frozen timestamp in list_items summaries, including archived results when requested. |
| packages/mcp-server/src/errors.ts | Classify controller and recoverable-transaction batch refusals as LEASE_CONFLICT. |
| packages/mcp-server/src/smoke.mjs | Prove real-actor admission, recoverable declaration behavior, batch summary/archived discovery, full-terminal release and unchanged 39-tool behavior. |
| plugins/kanmer/skills/kanmer-execute/SKILL.md | Keep one footer per exact frozen member and name the controller/recovery rule. |
| plugins/kanmer/skills/kanmer-review/SKILL.md | Tell one fresh reviewer how to review the shared exact head once and write a member-owned attestation for every roster ticket. |
| plugins/kanmer/skills/kanmer-closeout/SKILL.md | Discover the full roster with list_items include_archived: true before shared Git cleanup and require every member terminal. |
| plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md | Document the take actor/controller, recoverable declaration, roster summary and terminal-release contract. |
| scripts/verify-skill-prose.mjs | Pin the complete-footer, per-member review and archived closeout-discovery wording. |
| scripts/verify-skill-prose.test.mjs | Regression fixtures for the new skill-prose invariants. |
| AGENTS.md | Update the canonical batch invariant and complete protected-path workflow in the same command/convention change. |
| docs/manual/glossary.md | Clarify one-controller ownership, complete protected roster and all-terminal cleanup. |
| apps/gui/src/renderer/src/manual/chapters.generated.ts | Generated manual mirror only, via npm run build:manual; no hand-written GUI logic. |
| plugins/kanmer/mcp/kanmer-mcp.cjs | Rebuilt committed standalone bundle so installed candidate behavior matches source. |

## Context files

| Path | What it tells the implementer |
|---|---|
| docs/functional/frd/FRD-030-renewable-workspace-leases-and-batches.md | Governing one-controller, frozen-membership, per-member evidence, no-second-workspace and all-terminal requirements. |
| packages/core/src/release.ts | Proven write-ahead intent and fail-closed recovery pattern from CORE-132; reuse the pattern, not its release-specific record model. |
| packages/core/src/io.ts | writeFileAtomic and withExclusiveFileLock semantics; do not add another lock or weaken durability. |
| packages/core/src/review-attestation.ts | Canonical review schema, including PR and full head identity, which every member evidence record must use. |
| packages/core/src/links.ts | Derived blockedBy direction; batch evidence must preserve current dependency semantics per member. |
| packages/mcp-server/src/git-reachability.mjs | Existing argv-safe reachability and board-ancestry collection; aggregate it rather than spawning a new Git implementation. |
| packages/mcp-server/src/execution-packet.ts | Existing claim.batch read surface and same-workspace exception; do not weaken physical board/foreign/branch checks. |
| CORE-124 research, plan, review and proof | Original batch implementation, AC4/AC5 evidence and deferred findings F-005/F-007/F-008/F-009/F-010. |
| CORE-125 research, plan and review | Board-wide write-lock contract that makes the declaration transaction serializable. |
| HZN-008 context.md | Stable v0.3.12 remains live; candidate operates only on copied/disposable boards until golden acceptance; no new engine or stage. |

## Ripple effects

- The protected kanmer-gate output gains a roster/batch identity but retains the existing singular ticketId and single-ticket check order for compatibility.
- list_items summaries gain one explicit batch block; consumers that ignore unknown keys are unchanged.
- The new sidecar manifest exists only for a frozen batch. Pending records roll forward only for the exact same actor/roster/take intent; active records retain the immutable roster until complete terminal clearing. Stable v0.3.12 ignores the sidecar because it reads area ticket folders only.
- The committed plugin bundle and generated manual must be rebuilt from the same final source head.
- verify:skills, test:scripts, core tests, check-pr tests, smoke, protocol, plugin identity, full verify, hosted verify and kanmer-gate all exercise affected production paths.

## Out of scope

- No Infisical work or credential rotation.
- No new MCP tool, stage, database, workflow engine, merge queue, provider abstraction or generic transaction framework.
- No GUI batch badge or hand-written apps/gui behavior.
- No batch-wide lease transfer policy, release-channel change, delivery-policy redesign, proof-consistency work from CORE-129, or reconciliation work from CORE-127/CORE-133.
- No change to isolated workspace semantics, force as a general lease concept, unrelated accepted minor risks, or FRD-030 text.
