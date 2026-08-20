# Research — MCP-024: SHA-bound review and proof records

## Questions

1. Can the existing document store preserve YAML frontmatter without a new document type or parser?
2. What exact advisory record shapes are needed now, and which fields will later gates/skills consume?
3. Which current MCP descriptions are materially wrong?

## Findings

### Storage and writing semantics

- `set_ticket_doc` writes exact Markdown content into any valid type-relative ticket path using `docPathIn`; `scratch/review` resolves to `scratch/review.md` and `proof` resolves to `proof/proof.md`. Source: `packages/core/src/store.ts` and `docpaths.ts`.
- Ticket documents are plain Markdown, so YAML frontmatter is preserved as bytes. No core schema/parser change is needed merely to store the records.
- `append_scratch` uses `fs.appendFile`. Appending cannot replace the frontmatter at the beginning of an existing file, so a review attestation must be written/re-written with whole-file `set_ticket_doc(doc:"scratch/review")`, preferably using `expected_version`.
- `get_ticket_doc` returns the exact content plus a 16-hex content-version token. `plan_hash` is exactly the version returned for bare `plan` (`plan/plan.md`), not a hash invented by the review skill and not a folder aggregate.

### Current stale descriptions

- The `get_ticket_doc` description in `packages/mcp-server/src/index.ts` still says scratch is addressed as `scratch-<slug>`; format 3 uses `scratch/<slug>`.
- The `append_scratch` description and its `slug` field still say it creates/reads `scratch-<slug>.md`; the actual store writes `scratch/<slug>.md` and reads it as `scratch/<slug>`.
- The same stale statements appear in `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md`, including a contradictory later paragraph that says the path differs. They must be made internally consistent.

### Review attestation schema

Normative top-level frontmatter:

```yaml
kind: review-attestation
pr: "<PR number or URL>"
head_sha: "<full reviewed PR head SHA>"
verdict: pass | needs-changes
reviewer: "<stable human/agent identity>"
independent: true | false
plan_hash: "<plan/plan.md content-version>"
ticket_updated: "<ticket updated timestamp read for review>"
findings: []
```

Each finding is an ordered mapping with:

```yaml
id: F-001
severity: blocker | major | minor | note
summary: "..."
disposition: open | fixed | rejected-with-reason | accepted-risk | deferred-to-ticket
reason: "..."              # required for rejected/accepted-risk; optional otherwise
ticket: "PR-001"           # required when deferred-to-ticket; optional otherwise
```

The body remains human-readable review detail. `head_sha` and `plan_hash` are the fields future merge checks consume. `findings` is advisory in this horizon; no hard prose/content gate is added.

### Proof record schema

Normative top-level frontmatter:

```yaml
kind: proof-record
merged_sha: "<full merge commit SHA>"
environment: "<exact OS/runtime/deployment description>"
verified_at: "<ISO-8601 timestamp>"
result: PASS | FAIL | INCONCLUSIVE | NOT_APPLICABLE | WAIVED_BY_OPERATOR
attempts: []
```

Each attempt is an ordered mapping with:

```yaml
attempted_at: "<ISO-8601 timestamp>"
command: "<exact command or manual check>"
cwd: "<repo-root-relative or injected path>"
exit_code: 0                 # null for a manual/inconclusive check
result: PASS | FAIL | INCONCLUSIVE | NOT_APPLICABLE
summary: "<observed output/result>"
```

- Attempts are chronological and append logically within a whole-file rewrite.
- A failed/inconclusive attempt is never deleted when a later attempt passes.
- `WAIVED_BY_OPERATOR` is a top-level disposition and must identify the operator/reason in the Markdown body; it is not a normal command-attempt result.
- Existence gates remain unchanged: any Markdown under `proof/`, including a `FAIL` record, satisfies the structural gate. The verify skill—not this ticket—must refuse progression on failing/inconclusive evidence.

### Parsing and future consumption

- `gray-matter` is already a core dependency and is the required parser for future `kanmer/gate`; regex extraction of `head_sha` is explicitly prohibited.
- This ticket documents and smoke-proves round-trip storage. It does not add unused production parsing code. CORE-025/SKILL-021 will consume the schema.
- DOC-011 owns the FRD-006 delta. This ticket must not hand-edit generated `docs/contributing/doc-structure.md` or pre-empt the governing-document ticket.

## Decisions

- Document the exact schemas in the existing MCP tool reference, not a new parallel spec.
- Correct both source descriptions and every corresponding tool-reference statement.
- Extend smoke to write, read, version-rewrite, and parse a representative attestation and proof record with `gray-matter`.
- Keep gates existence-based and advisory in 0.4.0.

## Remaining unknowns

None. Later skills decide actual reviewer identity, GitHub SHA acquisition, exact-SHA verification, and merge choreography under SKILL-021.
