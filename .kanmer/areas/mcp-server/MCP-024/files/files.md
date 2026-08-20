# Files — MCP-024

## Modify

| Path | Required change |
|---|---|
| `packages/mcp-server/src/index.ts` | Correct `get_ticket_doc` scratch addressing to `scratch/<slug>`; correct `append_scratch` description and slug field to write `scratch/<slug>.md` and read `scratch/<slug>`. Clarify that SHA-bound records are whole-file writes through `set_ticket_doc`, not appends. Do not add validation or a tool. |
| `packages/mcp-server/src/smoke.mjs` | Round-trip a review attestation at `scratch/review` and a proof record at `proof`; parse returned frontmatter with `gray-matter`; assert required fields/enums, plan content-version linkage, whole-file rewrite/version handling, retained failed attempt, and unchanged existence-gate semantics. |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | Fix every stale `scratch-<slug>` statement; add one normative `## SHA-bound record schemas` section defining the exact review/proof frontmatter and finding/attempt mappings; state whole-file replace, gray-matter consumption, advisory/existence-gate semantics, and attempt retention. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Regenerate after source description changes from a normal main checkout. Do not hand-edit. |

## Inspect / consider

| Path | Reason |
|---|---|
| `packages/core/src/store.ts` | Confirms `setDoc` preserves frontmatter bytes, versions exact content, and `appendScratch` cannot rewrite the beginning. No change needed. |
| `packages/core/src/docpaths.ts` | Confirms bare/index and `scratch/review` path resolution. No change needed. |
| `packages/core/src/io.ts` | Defines the 16-hex content version used as `plan_hash`. Do not implement a second hash. |
| `packages/core/src/gates.ts` / `profiles.ts` | Gates check existence only. Do not add record-content validation. |
| `packages/core/package.json` | `gray-matter` is already available; no dependency addition. |
| `plugins/kanmer/skills/kanmer-review/SKILL.md` and asset | Currently append prose; SKILL-021 owns migration to the attestation and SHA acquisition. Inspect, do not modify here. |
| `plugins/kanmer/skills/kanmer-verify/SKILL.md` | Currently writes prose proof; SKILL-021 owns exact-SHA record choreography. Inspect only. |
| `docs/functional/frd/FRD-006-typed-proof.md` | DOC-011 owns the schema delta. Do not edit in this ticket. |
| `docs/contributing/doc-structure.md` | Generated file with stale layout text; DOC-011/build-manual owns regeneration. Do not hand-edit. |
| `MASTERPLAN.md` S-07 / Appendix A | Exact top-level fields, whole-file requirement, plan-hash source, advisory gate policy. |

## Exact record locations

- Review: `scratch/review.md`, addressed as `set_ticket_doc(doc: "scratch/review")` and read the same way.
- Proof: `proof/proof.md`, addressed as `set_ticket_doc(doc: "proof")` and read the same way.
- Plan hash source: `get_ticket_doc(doc: "plan").version` for `plan/plan.md`.

## Ripple effects

- SKILL-021 must replace the review/verify skill prose and assets to emit these exact records.
- CORE-025 reads `head_sha` with `gray-matter`; spelling/types are compatibility boundaries.
- A later successful proof attempt must keep earlier failures in `attempts[]`; whole-file rewrites therefore require read-modify-write with `expected_version`.
- Tool count stays unchanged, but bundled source bytes and the tool reference change.

## Do not modify

- Gate evaluation, proof requirement semantics, profile maps, or move behaviour.
- Add a review document type, new MCP tool, schema-enforcement engine, package, or regex parser.
- Modify the review/verify skills before SKILL-021.
- Hand-edit generated doc structure or FRD-006 before DOC-011.
- Use `append_scratch` for the attestation.
