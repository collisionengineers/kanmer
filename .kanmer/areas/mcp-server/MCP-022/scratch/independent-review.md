# Independent review — MCP-022 / PR #102

## Disclosure and evidence boundary

This is an independent post-hoc review; I was not the MCP-022 implementation author. I read the complete ticket packet (ticket body, `research/project-fingerprint-and-errors.md`, `files.md`, `plan.md`, `checklist.md`, `open-questions.md`, `post-implementation-report.md`, `proof.md`, and the prior self-review/execution scratch), both governing refs (`ADR-0016-compiled-workflow.md`, `FRD-022-mcp-server-surface.md`), PR #102's merged diff/comments, and current merged-main sources.

PR #102: https://github.com/collisionengineers/kanmer/pull/102  
Implementation: `7283abf6705089cf536494db99fcbb18876a2ece`; merge: `f148769993472ede046cc6201645a5080481eebd`. Checks below ran from local `main` at `1962f02`, which includes MCP-033's canonical plugin-bundle repair. No stage change or merge action was performed.

## Changes inspected

- `project-identity.ts`: canonical roots and ordered SHA-256 `kanmer-proj-v1:` fingerprint, excluding `boardSource`.
- `errors.ts`: the three-code union and the single coded error-result builder.
- `index.ts`: central mutating-tool schema decoration, call-level `expected_project`, pre-`ensureInit()` comparison/stripping, status project/compat fields, and handler wiring.
- `smoke.mjs` / `smoke-protocol.mjs`: schema inventory, identity vectors, zero-byte wrong-project refusal, compatibility/error-shape checks.
- `tsup.config.ts`, generated plugin bundle, and canonical tool reference.

The implementation matches the packet and governing intent for optional compatibility, exact payload/key order, no YAML leakage, unchanged legacy text, and exactly three structured codes. MCP-033's post-merge bundle repair is present and verified; it is not left as an open finding.

## Comments and dispositions

1. **P1 — cross-platform Windows vectors are not portable.** `smoke.mjs` passes Windows-looking strings to native `path.resolve`, but unconditionally expects `c:/Kanmer/Board` and `c:/`. On Linux/macOS those inputs are relative strings, so the required smoke command fails. The Windows run here passes, but the cross-host claim is incomplete. **Disposition: follow-up remediation candidate** — use `path.win32` for Windows vectors or make the vector harness platform-independent.

2. **P2 — leaving-boundary gate refusals are not coded.** `errors.ts` classifies `entering ... requires ...` and `cannot move ... crosses ...`, but not core's single-boundary `leaving ... requires ...` wording. I reproduced this on current main with a fresh ticket moved from Backlog to Implementing: the result was `Error: TICK-001 cannot move ... leaving Preparing requires files, plan ...` and had no `structuredContent.error.code`. This conflicts with the ticket's “structured code on ... gate” acceptance claim and FRD-022's structured `GATE_BLOCKED` end-state; existing smoke covers entering/collapsed gates only. **Disposition: follow-up remediation candidate** — classify the remaining core gate refusal forms narrowly or expose an explicit core signal.

3. **P1 governance — the new schema convention is absent from AGENTS.md.** The implementation relies on every mutating registration carrying `readOnlyHint: false` so the central wrapper adds the guard, and clients must sniff `compat.expectedProject`. The current AGENTS guidance says annotations are required but does not document this dependency or the compatibility convention. AGENTS' standing rule 24 requires a convention change to update AGENTS.md in the same PR. The canonical tool reference is updated, but it is not a substitute for the repository operating guide. **Disposition: follow-up documentation/remediation candidate**; no AGENTS mutation was made during this audit.

4. **Closed artifact issue:** PR #102 initially carried a linked-worktree-generated bundle; MCP-033 refreshed it on merged main. Current `npm run plugin:check` passes with matching bytes and v0.3.3 manifests. **Disposition: fixed/closed by MCP-033.**

## Verification evidence

- `npm run build`: exit 0.
- `node packages/mcp-server/src/smoke.mjs`: 184/184 pass.
- `npm run smoke:protocol`: 42/42 pass.
- `npm run smoke:discovery`: 13/13 pass.
- `npm run test:http -w @kanmer/mcp-server`: 3/3 pass.
- `npm run typecheck -w @kanmer/mcp-server`: exit 0.
- `npm run plugin:check`: pass; 30 tools, matching bundle bytes, 12 skill frontmatters, v0.3.3 manifests, isolated handshake.
- `git diff --check`: exit 0.
- Working tree remained unchanged apart from pre-existing untracked `skills-lock.json`.

## Verdict

**PASS WITH FINDINGS (merged behavior is green on current main; three follow-up remediation candidates remain).** No stage change, merge, ticket creation, or implementation change was performed.
