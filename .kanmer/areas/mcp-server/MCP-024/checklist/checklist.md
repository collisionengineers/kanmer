# Checklist — MCP-024

## Canonical record schemas

- [ ] Correct the `get_ticket_doc` source description to address scratch documents as `scratch/<slug>`.
- [ ] Correct the `append_scratch` source description and `slug` field to say it writes `scratch/<slug>.md` and is read through `scratch/<slug>`.
- [ ] State explicitly that `append_scratch` is for running notes and cannot own frontmatter records.
- [ ] Replace every stale `scratch-<slug>` statement in the canonical tool reference.
- [ ] Add one normative review-attestation schema section in the canonical tool reference.
- [ ] Document exact review fields: `kind`, `pr`, `head_sha`, `verdict`, `reviewer`, `independent`, `plan_hash`, `ticket_updated`, and `findings`.
- [ ] Document exact review verdicts and nested finding severity/disposition enums.
- [ ] Document when finding `reason` and remediation `ticket` are required.
- [ ] State that `plan_hash` is exactly `get_ticket_doc(doc:"plan").version`.
- [ ] State that review records are whole-file `set_ticket_doc(doc:"scratch/review")` writes with `expected_version` on replacement.
- [ ] Add one normative proof-record schema section in the canonical tool reference.
- [ ] Document exact proof fields: `kind`, `merged_sha`, `environment`, `verified_at`, `result`, and `attempts`.
- [ ] Document exact top-level proof result enum.
- [ ] Document exact nested attempt fields and attempt result enum.
- [ ] State that attempts are chronological and failed/inconclusive attempts cannot be erased by a later pass.
- [ ] State that `WAIVED_BY_OPERATOR` requires operator identity and reason in the Markdown body.
- [ ] State that schemas remain advisory and gates remain existence-based in this horizon.

## Smoke proof

- [ ] Create a fixture ticket with `plan/plan.md` and retain its returned content-version.
- [ ] Write a representative review attestation through `set_ticket_doc(doc:"scratch/review")`, never `append_scratch`.
- [ ] Read the review through `get_ticket_doc(doc:"scratch/review")` and parse frontmatter with `gray-matter`.
- [ ] Assert every required top-level review field and enum.
- [ ] Assert `plan_hash` exactly equals the plan document’s returned version.
- [ ] Assert nested findings preserve IDs, severities, summaries, dispositions, reasons, and remediation ticket references.
- [ ] Rewrite the attestation using the current `expected_version` and confirm whole-file replacement/version change.
- [ ] Attempt a stale-version rewrite and confirm existing revision-conflict behaviour remains unchanged.
- [ ] Write proof with a first failed attempt and top-level `FAIL`.
- [ ] Rewrite proof with a later passed attempt and top-level `PASS`, retaining the original failed attempt in order.
- [ ] Parse and assert exact proof fields, result values, timestamps, environment, exit codes, and attempt ordering.
- [ ] Confirm the ordinary proof-existence gate is satisfied independent of parsed `PASS`/`FAIL`, proving no content gate was added.
- [ ] Confirm ordinary `append_scratch(slug:"review")` still maps to `scratch/review.md`, but is not used by the attestation flow.
- [ ] Add a rail/smoke assertion that stale `scratch-<slug>` teaching no longer appears in MCP descriptions or the canonical reference.

## Build, scope, and handoff

- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Run the standard, protocol, and discovery MCP smokes.
- [ ] Run `npm run verify:skills`.
- [ ] From a normal main checkout, run `npm run plugin:build && npm run plugin:check` and commit the generated bundle.
- [ ] Confirm only the MCP descriptions, MCP smoke, canonical tool reference, and generated bundle changed.
- [ ] Confirm no core gate/profile/document-type logic, skill file, FRD, generated doc-structure file, dependency, tool, or tool count changed.
- [ ] Open the PR with `Kanmer: MCP-024` and identify `set_ticket_doc`/`get_ticket_doc` as the production storage surface and SKILL-021/CORE-025 as downstream consumers.
- [ ] Keep every failed test attempt in the implementation report rather than replacing it with the final green result.
- [ ] Stop at review readiness; do not merge or begin SKILL-021.

## Progress notes

Append exact document versions, parsed frontmatter objects, retained-attempt evidence, command exit codes, and generated-bundle status here.
