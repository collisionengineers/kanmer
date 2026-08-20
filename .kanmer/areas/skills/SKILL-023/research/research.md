# Research — SKILL-023: put the agent conduct canon in the managed AGENTS block

## Question

How can Kanmer distribute MASTERPLAN §4's conduct canon to every managed `AGENTS.md` without creating a second source of truth, weakening the existing refresh guarantees, or changing `get_status.repo`'s staleness model?

## Findings

- `MASTERPLAN.md` §4 is the authoritative conduct canon. It has 24 numbered rules, grouped as Scope (1–5), Build (6–13), Prove (14–21), and Conduct (22–24); §6.4 S-27 explicitly assigns this ticket the managed-block delivery, hash-staleness, and verification work.
- `scripts/agents-block-body.mjs` is the canonical data source for the managed block. `scripts/agents-block.mjs` and the GUI Connect path import/re-export it; no writer owns an independent body. Source: the module header and `apps/gui/src/main/agentsBlock.ts` check in `verify-agents-block.mjs`.
- `plugins/kanmer/skills/kanmer-setup/SKILL.md` is necessarily the only literal duplicate: it ships as standalone prose. Check 7 in `scripts/verify-agents-block.mjs` extracts its fenced marker span and requires byte-for-byte equality with `BLOCK_BODY`.
- The existing verifier exercises creation, prepend, idempotence, stale-body refresh, marker-malformation refusal, CLAUDE.md pointer behaviour, exact setup-skill mirroring, local AGENTS body, and GUI import shape. Its use of `BLOCK_BODY` already proves a changed body distributes through those paths, but a named conduct assertion would make the new contract visible in its output.
- `packages/core/src/staleness.ts` discovers the reference body by extracting the markers from the answering server's bundled `kanmer-setup/SKILL.md`, normalises and hashes the body, and reports any differing managed body as `agents-block: behind`. It contains no embedded copy of the body. Changing the canonical body and its fenced mirror therefore makes an older block stale automatically on the next `get_status`.
- `packages/core/src/staleness.test.ts` and `packages/mcp-server/src/smoke.mjs` already cover the behind state for a stale managed block. The planned test should make the old-body-without-conduct case explicit so the contract is not merely inferred from generic hash inequality.
- `EPIC-012/context.md` requires every repo Kanmer works to have the managed block plus conduct canon, reconciliation through setup, and drift visibility in `get_status.repo`; SKILL-023 blocks the epic integration ticket [[SKILL-026]]. `HZN-006/context.md` is absent.

## Implications

- Add a compact `## Agent conduct` section to the one canonical `BLOCK_BODY`, preserving all 24 rules as one concise line each and retaining the four canonical groups. Do not copy the MASTERPLAN's incident anecdotes into every downstream repository.
- Mirror that exact section in the setup skill's fenced block; retain check 7's full-body equality rather than adding a second generated mechanism.
- Extend the E2E verifier with an explicit conduct-section assertion and update the stale-block test/fixture to represent the former body without the conduct section. No `staleness.ts` algorithm change is required: content hash is deliberately the mechanism.
- This ticket correctly remains `docs_todo: true`: the authoritative requirement is the repository's MASTERPLAN seed, not an approved PRD/FRD/ADR in `docs/`; [[DOC-014]] will establish the broader authoring guidance.

## Open questions

- None requiring a user decision. The source canon, its exact 24-rule scope, and the existing single-source distribution/staleness architecture are authoritative.
