# Research — SKILL-024: reconcile an AGENTS.md skeleton

## Question

How should `kanmer-setup` ensure a repository has the required user-owned AGENTS.md guide structure while retaining the existing managed-block writer’s strict ownership and idempotency guarantees?

## Findings

- **DOC-014 already delivered the only skeleton to consume.** `plugins/kanmer/skills/kanmer-docs/assets/agents-template.md` contains the user-owned Commands, Architecture map, Conventions, Gotchas, and Verification sections, with TODOs, a command/purpose table, and deterministic checks before manual checks. DOC-014’s report explicitly names SKILL-024 as its consumer.
- **The managed-block writer cannot own the skeleton.** `scripts/agents-block.mjs` only creates a managed block plus a stub heading when AGENTS.md is absent; for an existing file it prepends or refreshes the marker span and preserves every other byte. Its malformed-marker refusal is a safety boundary, not a condition setup may work around.
- **kanmer-docs already establishes the intended missing-versus-present rule.** Its “Project guide outside the managed block” section says to use `assets/agents-template.md` only when AGENTS.md is absent; an existing guide is assessed and its human prose preserved.
- **The target change is skill behavior, not a new MCP/core capability.** The portable setup surface is `plugins/kanmer/skills/kanmer-setup/SKILL.md`; adding a second writer, managed-block body, or template copy would violate the single-source/ownership rules.
- **Heading presence should not force a repository’s document style.** Setup can recognize the five required labels case-insensitively at any Markdown heading depth outside the managed span, then report missing labels only. It must not judge the quality of present prose, fill TODOs, or rewrite a partial guide.
- **A missing guide requires an idempotent follow-up ticket after board setup exists.** The setup flow’s managed-block refresh happens before its normal ingestion/greenfield board writes. Record the need then, after a board exists, search by a stable source marker before creating one backlog documentation ticket. Prefer the `docs` area when configured; otherwise leave area unset rather than assuming a board shape.
- **Group contract confirms the boundary.** EPIC-012 requires the managed block, conduct canon, and required-section skeleton to be reconciled and proven later by SKILL-026. HZN-006 has no context document. SKILL-023 changed only the managed conduct canon and is expressly out of scope here.

## Implications

Update `kanmer-setup` to execute a three-case reconciliation around the existing writer and DOC-014 asset: missing AGENTS.md becomes template + managed block and produces one source-marked docs ticket; present partial AGENTS.md has only its missing section labels reported; present complete AGENTS.md has no user-owned guide mutation. In all cases the managed writer retains sole authority for markers and CLAUDE.md. Add focused prose/contract coverage and disposable-directory verification of all three cases and repeatability.

## Open questions

None. The ticket, DOC-014, and EPIC-012 approval contract determine both the section contract and the ownership boundary.
