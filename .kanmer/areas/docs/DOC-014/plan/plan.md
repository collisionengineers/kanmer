# Plan — DOC-014: canonical AGENTS.md template and guidance

## Approach

Add one source-of-truth, user-owned AGENTS.md skeleton to `kanmer-docs/assets`, then make the kanmer-docs skill point to it explicitly. The asset will complement—not reproduce—the setup-owned marker block: it is only for the project guide outside the markers. It will use the five headings required by [[SKILL-024]], concise section-local guidance/TODOs, a Commands table, and a deterministic-first Verification checklist. This is narrower and safer than changing the writer or setup skill before their reconciliation contract is implemented.

## Governing docs

DOC-014 has no linked governing document and its `chore` profile has no leave-Backlog governing-doc gate. This is a bounded documentation asset, not a product-behaviour or architecture change, so it does not create or modify a PRD, FRD, or ADR. The plan follows the EPIC-012 approval contract and SKILL-024’s existing required-section contract.

## Steps

1. Inspect the existing kanmer-docs templates and skill prose for asset conventions; define the new asset’s ownership preamble so it is unambiguously outside the Kanmer managed block.
2. Add `agents-template.md` under `plugins/kanmer/skills/kanmer-docs/assets/` with these headings and guidance:
   - Commands: a Markdown command/purpose table;
   - Architecture map: a concise repo-map structure and what each area owns;
   - Conventions: repeatable normal rules;
   - Gotchas: surprising, consequential traps with their mitigation;
   - Verification: deterministic commands first, manual/environment-dependent checks second.
   Retain explicit TODO markers so a missing-file instantiation cannot masquerade as a complete project guide.
3. Update `plugins/kanmer/skills/kanmer-docs/SKILL.md` to identify the asset, direct agents to use it for an absent AGENTS.md, and state that a present project guide is assessed for missing sections rather than rewritten. Link the managed-block boundary back to kanmer-setup.
4. Add or extend a focused static verification in the existing dependency-free skill-prose/script test surface so the asset’s required headings, Commands table, deterministic-first Verification ordering, and kanmer-docs reference cannot silently disappear.
5. Run the focused script test plus `npm run verify:skills`, inspect the template as rendered Markdown, and confirm no managed-block writer/setup behaviour changed. Record the precise checks in the implementation report.

## Verification

- The new asset has exactly the five required guide sections and readable authoring guidance/TODOs.
- Commands is a table, and Verification places deterministic commands/checks before manual confirmation.
- kanmer-docs names the asset and preserves the boundary: missing AGENTS.md may be templated; existing human prose is never rewritten by this documentation guidance.
- `npm run verify:skills` and the focused script test pass; `git diff --check` is clean.
- A diff audit confirms `scripts/agents-block*.mjs` and `kanmer-setup/SKILL.md` are unchanged.

## Risks / open questions

- **Duplicating ownership:** copying the managed block into the template would create drift. Mitigation: explicit outside-markers preamble and a negative diff check against writer/setup files.
- **A generic template mistaken for complete guidance:** mitigate with visible TODO markers and instructions to report missing sections on an existing file instead of overwriting it.
- **User-only questions:** none. The ticket, SKILL-024, and EPIC-012 context settle both the required structure and ownership boundary.
