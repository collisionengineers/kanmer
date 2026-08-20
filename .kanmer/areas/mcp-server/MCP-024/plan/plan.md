# Plan — MCP-024: SHA-bound review and proof records

## Objective

Define one exact, human-readable/frontmatter-backed review attestation and proof record, prove they round-trip through the existing MCP document surface, and correct the stale scratch-path descriptions without changing any gate semantics.

## Starting state

- Reviews are appended as prose to scratch and have no exact PR head or plan version.
- Proof is prose with no mandatory merged SHA/result/attempt history.
- `set_ticket_doc` can already whole-file write `scratch/review` and `proof` with content versions.
- `append_scratch` cannot replace frontmatter.
- MCP/tool-reference descriptions still teach the retired `scratch-<slug>` addressing form.

## Governing constraints

- EPIC-009: SHA-bound advisory records; no new gated type.
- ADR-0005/FRD-006: structural proof gate remains existence-based.
- MASTERPLAN S-07 / Appendix A: exact top-level fields, plan-hash source, whole-file review writes, retained proof attempts, gray-matter future parsing.
- DOC-011 owns FRD-006 changes; SKILL-021 owns workflow/skill adoption.

## Required changes

1. In the tool reference, define review location/addressing:
   - physical `scratch/review.md`;
   - MCP doc path `scratch/review`;
   - whole-file `set_ticket_doc`, append omitted/false;
   - read current version before rewriting and pass `expected_version`.
2. Define review frontmatter exactly:

   ```yaml
   kind: review-attestation
   pr: "123"
   head_sha: "<40-hex SHA>"
   verdict: pass
   reviewer: "reviewer-id"
   independent: true
   plan_hash: "<16-hex content version>"
   ticket_updated: "<ISO-8601>"
   findings: []
   ```

3. Specify types/constraints:
   - `kind` exact literal;
   - `pr` non-empty string accepting number or URL representation;
   - `head_sha` full commit id returned by GitHub, normally 40 lowercase hex;
   - verdict exactly `pass | needs-changes`;
   - reviewer non-empty stable identity;
   - independent boolean;
   - plan_hash exact `get_ticket_doc(plan).version`, not recomputed;
   - ticket_updated exact ticket timestamp read for review;
   - findings ordered array.
4. Define each finding mapping with exact keys/enums:
   - `id` stable `F-###`-style string;
   - `severity`: `blocker | major | minor | note`;
   - `summary` non-empty string;
   - `disposition`: `open | fixed | rejected-with-reason | accepted-risk | deferred-to-ticket`;
   - `reason` required for rejected/accepted-risk and optional otherwise;
   - `ticket` required for deferred-to-ticket and optional otherwise.
5. State body expectations: changes checked, acceptance coverage, detailed findings/dispositions, residual risk; frontmatter remains machine-facing authority.
6. Define proof location/addressing: physical `proof/proof.md`, MCP doc `proof`, whole-file rewrite with expected version.
7. Define proof frontmatter exactly:

   ```yaml
   kind: proof-record
   merged_sha: "<40-hex merge SHA>"
   environment: "Windows 11 / Node 20 / local merged worktree"
   verified_at: "<ISO-8601>"
   result: PASS
   attempts: []
   ```

8. Specify top-level proof result enum exactly: `PASS | FAIL | INCONCLUSIVE | NOT_APPLICABLE | WAIVED_BY_OPERATOR`.
9. Define each attempt mapping:
   - `attempted_at` ISO timestamp;
   - `command` exact command/manual check text;
   - `cwd` repository-root-relative or injected/configured path, never personal absolute path;
   - `exit_code` integer or null for manual/inconclusive checks;
   - `result`: `PASS | FAIL | INCONCLUSIVE | NOT_APPLICABLE`;
   - `summary` observed result/output synopsis.
10. State attempts are chronological and immutable history: a rewrite may append/fix metadata but never remove a failed/inconclusive attempt to present a clean final state.
11. State `WAIVED_BY_OPERATOR` requires operator identity/reason in body and is not an attempt result.
12. State record content is advisory in this horizon: `FAIL` proof still structurally exists; SKILL-021 must stop rather than move Done.
13. In `packages/mcp-server/src/index.ts`, correct `get_ticket_doc` description to use type-relative paths including `scratch/<slug>`.
14. Correct `append_scratch` description and slug field to say it writes `scratch/<slug>.md`, read with `get_ticket_doc(doc:"scratch/<slug>")`.
15. Mention that append is for running notes; frontmatter records require whole-file `set_ticket_doc`.
16. In the tool reference, replace every `scratch-<slug>` occurrence and remove the contradictory “doc id/path differ” statement. Ensure the layout and examples all use `scratch/<slug>`.
17. Add the normative record-schema section once, before field semantics or another stable reference location; do not duplicate it in multiple tool rows.

## Smoke proof

18. Import `gray-matter` in `smoke.mjs` solely for test parsing; do not add a dependency.
19. Create/prepare a ticket with a plan; read bare `plan` and retain its returned version.
20. Construct a representative review Markdown string with the exact frontmatter and a body.
21. Write it through `set_ticket_doc(doc:"scratch/review")`, not `append_scratch`.
22. Read it through `get_ticket_doc(doc:"scratch/review")`; parse returned content with gray-matter.
23. Assert every top-level field, enum, `plan_hash === plan.version`, findings array shape, and returned version.
24. Rewrite the review using the returned `expected_version`; assert the file is replaced (not duplicated/appended) and version changes.
25. Attempt a stale-version rewrite and assert normal revision-conflict behaviour remains.
26. Create proof with first attempt `FAIL` and top-level `FAIL`; write/read/parse it.
27. Rewrite with a second `PASS` attempt and top-level `PASS`, retaining the first failure; assert both attempts in order.
28. Assert the ordinary proof existence gate is satisfied regardless of parsed top-level result, proving no hidden content gate was added.
29. Assert `append_scratch(slug:"review")` still writes the same physical doc path for ordinary notes, but do not use it for the attestation fixture.
30. Add source/reference string assertions ensuring no stale `scratch-<slug>` teaching remains in MCP descriptions or canonical tool reference.

## Build and artifacts

31. Run build/typecheck and all MCP smokes.
32. Run the tool-reference/plugin synchronization checks required by the repository.
33. From a normal main checkout, run `npm run plugin:build && npm run plugin:check` and commit regenerated bundle bytes.
34. Confirm no core files, gate logic, profiles, skill files, FRD, generated doc-structure, or tool count changed.
35. Open the PR with `Kanmer: MCP-024`; identify `get_ticket_doc`/`set_ticket_doc` as the production storage path and SKILL-021/CORE-025 as downstream consumers.

## Expected files

Modify:
- `packages/mcp-server/src/index.ts`
- `packages/mcp-server/src/smoke.mjs`
- `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md`
- `plugins/kanmer/mcp/kanmer-mcp.cjs` (generated)

## Acceptance checks

- Exact review/proof schemas and nested mappings are documented once.
- A review frontmatter round-trip preserves full SHA, plan content-version, ticket timestamp, verdict, identity, and findings.
- A proof rewrite retaining failed then passed attempts is proven.
- Whole-file expected-version writes, not scratch append, own records.
- `gray-matter` parses the smoke records; no regex parser is introduced.
- `scratch/<slug>` descriptions/examples are internally consistent.
- Proof gate remains existence-only and no new doc/tool/type exists.
- Plugin bundle and reference synchronize.

## Verification commands

```bash
npm run typecheck
npm run build
node packages/mcp-server/src/smoke.mjs
npm run smoke:protocol
npm run smoke:discovery
npm run verify:skills
```

From normal main checkout:

```bash
npm run plugin:build
npm run plugin:check
git diff --check
git status --short
```

## Risks / deviation rules

- Do not use `append_scratch` for a record that must update frontmatter.
- Do not compute `plan_hash` separately or use a folder hash.
- Do not delete historical failed attempts after a pass.
- Do not add record-content gates, validation engines, new docs/types/tools, or regex SHA extraction.
- Do not modify review/verify skills or FRD-006 in this ticket.
- Do not merge or begin SKILL-021.

## Stop condition

Stop when the canonical reference contains exact record schemas, all MCP scratch-path teaching matches format 3, smoke proves gray-matter round-trip and retained failed attempts through whole-file versioned writes, gate behaviour remains existence-only, generated plugin bytes are synchronized, and the PR is ready for independent review. Do not merge or start SKILL-021.
