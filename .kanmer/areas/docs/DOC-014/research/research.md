# Research — DOC-014: canonical AGENTS.md template

## Question

What reusable asset should give a repository owner a complete, useful AGENTS.md structure outside Kanmer’s managed block, and how should the kanmer-docs skill direct an agent to author that human-owned content without overwriting it?

## Findings

- **The ownership boundary already exists and is non-negotiable.** `scripts/agents-block.mjs` writes or refreshes only the marker-delimited Kanmer block. When AGENTS.md is absent it adds a stub `# Contributor guide`; when present it prepends or refreshes the block without changing bytes outside the markers.
- **SKILL-024 consumes this ticket’s result.** Its target behaviour is to ensure the user-owned part of AGENTS.md has five sections: Commands, Architecture map, Conventions, Gotchas, and Verification. Missing file means create from the canonical template with TODO markers; a present partial file is reported, not rewritten.
- **The setup skill supplies operating rules but no reusable user-owned skeleton.** `plugins/kanmer/skills/kanmer-setup/SKILL.md` contains only the managed block and the minimal missing-file stub. It must remain the owner of that block, not become a second source of the project guide.
- **kanmer-docs is the appropriate delivery point.** It owns reusable authoring assets under `plugins/kanmer/skills/kanmer-docs/assets/` and already distinguishes durable repo documents from per-ticket work. Adding an AGENTS template there makes it available to setup and human/agent contributors without conflating it with the managed block.
- **The template must teach classification, not only headings.** Conventions are repeatable normal rules (naming, formatting, module boundaries, branch/commit expectations). Gotchas are surprising, consequential traps with a concrete failure mode and mitigation. Commands must be a Markdown table so each command pairs with its purpose. Verification must lead with deterministic commands/checks, then list any manual or environment-dependent confirmation separately.
- **No group context changes scope.** EPIC-012 requires Kanmer-owned block + conduct canon + required-section skeleton, reconciled without hiding drift; HZN-006 has no context file. The template must therefore be user-owned content designed to coexist with the managed block, not a replacement for it.
- **Existing descriptive docs are stale format-2 material, but are not this template contract.** `docs/contributing/doc-structure.md` currently describes v2 ticket documents; changing that broader generated-mirror issue would expand DOC-014 beyond the requested kanmer-docs asset and skill reference.

## Implications

Create one Markdown asset in kanmer-docs with a clear “outside the managed block” boundary, the five required headings, section-local HTML guidance/TODO markers, a commands table, and a deterministic-first verification checklist. Update kanmer-docs prose to name the asset and explain that it is copied only for a missing AGENTS.md; an existing user guide is assessed for missing sections rather than rewritten. Leave the writer, managed block, setup implementation, and generated documentation model to their owning tickets.

## Open questions

None. The linked skeleton contract supplies the headings and the ticket supplies the section-level standards; no product or user choice is needed to author a reusable template.
