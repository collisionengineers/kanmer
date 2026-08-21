# Checklist — MCP-024

## Canonical record schemas

- [x] Correct the `get_ticket_doc` source description to address scratch documents as `scratch/<slug>`.
- [x] Correct the `append_scratch` source description and `slug` field to say it writes `scratch/<slug>.md` and is read through `scratch/<slug>`.
- [x] State explicitly that `append_scratch` is for running notes and cannot own frontmatter records.
- [x] Replace every stale `scratch-<slug>` statement in the canonical tool reference.
- [x] Add one normative review-attestation schema section in the canonical tool reference.
- [x] Document exact review fields: `kind`, `pr`, `head_sha`, `verdict`, `reviewer`, `independent`, `plan_hash`, `ticket_updated`, and `findings`.
- [x] Document exact review verdicts and nested finding severity/disposition enums.
- [x] Document when finding `reason` and remediation `ticket` are required.
- [x] State that `plan_hash` is exactly `get_ticket_doc(doc:"plan").version`.
- [x] State that review records are whole-file `set_ticket_doc(doc:"scratch/review")` writes with `expected_version` on replacement.
- [x] Add one normative proof-record schema section in the canonical tool reference.
- [x] Document exact proof fields: `kind`, `merged_sha`, `environment`, `verified_at`, `result`, and `attempts`.
- [x] Document exact top-level proof result enum.
- [x] Document exact nested attempt fields and attempt result enum.
- [x] State that attempts are chronological and failed/inconclusive attempts cannot be erased by a later pass.
- [x] State that `WAIVED_BY_OPERATOR` requires operator identity and reason in the Markdown body.
- [x] State that schemas remain advisory and gates remain existence-based in this horizon.

## Smoke proof

- [x] Create a fixture ticket with `plan/plan.md` and retain its returned content-version.
- [x] Write a representative review attestation through `set_ticket_doc(doc:"scratch/review")`, never `append_scratch`.
- [x] Read the review through `get_ticket_doc(doc:"scratch/review")` and parse frontmatter with `gray-matter`.
- [x] Assert every required top-level review field and enum.
- [x] Assert `plan_hash` exactly equals the plan document’s returned version.
- [x] Assert nested findings preserve IDs, severities, summaries, dispositions, reasons, and remediation ticket references.
- [x] Rewrite the attestation using the current `expected_version` and confirm whole-file replacement/version change.
- [x] Attempt a stale-version rewrite and confirm existing revision-conflict behaviour remains unchanged.
- [x] Write proof with a first failed attempt and top-level `FAIL`.
- [x] Rewrite proof with a later passed attempt and top-level `PASS`, retaining the original failed attempt in order.
- [x] Parse and assert exact proof fields, result values, timestamps, environment, exit codes, and attempt ordering.
- [x] Confirm the ordinary proof-existence gate is satisfied independent of parsed `PASS`/`FAIL`, proving no content gate was added.
- [x] Confirm ordinary `append_scratch(slug:"review")` still maps to `scratch/review.md`, but is not used by the attestation flow.
- [x] Add a rail/smoke assertion that stale `scratch-<slug>` teaching no longer appears in MCP descriptions or the canonical reference.

## Build, scope, and handoff

- [x] Run `npm run typecheck`.
- [x] Run `npm run build`.
- [x] Run the standard, protocol, and discovery MCP smokes.
- [x] Run `npm run verify:skills`.
- [x] From a normal main checkout, run `npm run plugin:build && npm run plugin:check` and commit the generated bundle — normal-main parity passed after merge; generated bundle is committed.
- [x] Confirm only the MCP descriptions, MCP smoke, canonical tool reference, and generated bundle changed.
- [x] Confirm no core gate/profile/document-type logic, skill file, FRD, generated doc-structure file, dependency, tool, or tool count changed.
- [x] Open the PR with `Kanmer: MCP-024` and identify `set_ticket_doc`/`get_ticket_doc` as the production storage surface and SKILL-021/CORE-025 as downstream consumers.
- [x] Keep every failed test attempt in the implementation report rather than replacing it with the final green result.
- [x] Stop at review readiness; do not merge or begin SKILL-021.

## Progress notes

Evidence: packet plan version b6803eed8207b19e. The stdio fixture parsed kind=review-attestation, pr=123, full 40-hex head_sha, verdict=pass, independent=true, plan_hash equal to the fixture plan version, ticket_updated, and two ordered findings. Review replacement changed its version and rejected a stale token. Proof parsed kind=proof-record with result=FAIL then PASS; the first FAIL attempt (exit 1) remains before the PASS attempt (exit 0). The FAIL proof still satisfied the existence-only proof gate. Standard smoke exited 0 with 195/195; protocol 42/42; discovery 13/13; HTTP 61/61; scripts 79/79; GUI 350/350; typecheck/build/verify:skills/diff-check exited 0. plugin:build exited 0; linked-worktree plugin:check refused by checkout guard (INCONCLUSIVE).
