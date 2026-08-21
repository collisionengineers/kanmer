# Post-implementation report — MCP-024

*The report. Not the proof — this is the author's claim, written before merge; proof is evidence, gathered after.*

## Summary

MCP-024 defines the advisory SHA-bound review-attestation and proof-record frontmatter schemas in the canonical MCP tool reference, corrects stale format-3 scratch-path teaching in the MCP source descriptions and reference, and adds a real stdio smoke round-trip. The smoke writes and parses records with gray-matter, binds review plan_hash to the returned plan content-version, proves whole-file expected-version replacement/conflict behavior, retains a failed proof attempt across a later pass, and confirms the proof gate remains existence-only. The generated plugin bundle is rebuilt from this source.

## Changes

| File | Change | Why |
|---|---|---|
| packages/mcp-server/src/index.ts | Corrected get_ticket_doc, set_ticket_doc, and append_scratch descriptions and parameter help to teach type-relative scratch/<slug> paths, running-note appends, and whole-file frontmatter writes. | Agents must address format-3 scratch files correctly and must not append into a SHA-bound record. |
| packages/mcp-server/src/smoke.mjs | Added gray-matter review/proof fixtures, field/enum assertions, plan-version binding, expected-version replacement and stale-conflict checks, retained FAIL-to-PASS attempt history, existence-gate assertion, ordinary scratch path assertion, and stale-blurb source/reference assertion. | The MCP document surface now has executable round-trip proof without adding a parser or content gate. |
| plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md | Replaced stale scratch-<slug> teaching and added one normative SHA-bound record-schema section covering fields, enums, retention, gray-matter, whole-file writes, and advisory gate semantics. | This is the canonical agent-facing contract for later review/verify consumers. |
| plugins/kanmer/mcp/kanmer-mcp.cjs | Regenerated with npm run plugin:build. | Installed plugins carry the changed MCP descriptions and the source/bundle artifact stays synchronized. |

## Governing docs

The ticket links DOC-011, which owns the FRD-006 proof-frontmatter and exact-SHA documentation delta. This implementation supplies the documented record contract and smoke evidence without editing FRD-006 or generated doc structure. EPIC-009's compiled-workflow approval contract and HZN-007's full-board rules were followed: gates remain existence-based, the author used a dedicated worktree, and downstream SKILL-021/CORE-025 consumers were not absorbed into this ticket.

## Risks / follow-ups

- npm run plugin:check was run from the linked ticket worktree and refused with the checkout-ownership guard because @kanmer/core resolves to the main checkout. This is retained as INCONCLUSIVE, not PASS; an independent reviewer should run npm run plugin:build and npm run plugin:check from a normal checkout after merge.
- No test failures occurred in the implementation rails. The linked-worktree plugin guard refusal is the only non-zero verification result and is recorded rather than erased.
- SKILL-021 owns workflow adoption and exact-SHA review/verify choreography; DOC-011 owns the governing FRD delta. Neither was modified here.

## Verification hand-off

On merged main, retain exact outputs from: npm run typecheck; npm run build; node packages/mcp-server/src/smoke.mjs (195/195); npm run smoke:protocol (42/42); npm run smoke:discovery (13/13); npm run test -w @kanmer/core (257/257); npm run test -w @kanmer/gui (350/350); npm run test:http -w @kanmer/mcp-server (61/61); npm run test:scripts (79/79); npm run verify:skills; npm run plugin:build and npm run plugin:check from normal main; and git diff --check. Confirm no core gate/profile/document-type semantics changed.
