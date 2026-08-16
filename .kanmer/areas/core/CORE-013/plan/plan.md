# 1.1 The `docs:` block + `docs.ts` module

- **Where:** `types.ts` (schema), new `packages/core/src/docs.ts`, `board.ts` (`defaultBoardConfig`), `index.ts` barrel.
- One new top-level `board.yml` block; `statuses/areas/priorities/idPrefixes` keep their shape:

```yaml
docs:
  repoDocs: { prd: docs/prd/**, frd: docs/frd/**, adr: docs/adr/** }   # ref kind ← path glob
  default:
    types:                                   # ORDER = hierarchy; `requires` = doc-before-doc gate
      - { id: research,       name: Research }
      - { id: impact,         name: Impact }
      - { id: open-questions, name: Open questions }
      - { id: plan,           name: Plan,      requires: [research, impact] }
      - { id: checklist,      name: Checklist, requires: [plan], progress: true }
      - { id: post-implementation-report, name: Post-implementation report }
      - { id: proof,          name: Proof }
    gates:                                   # doc-before-stage hard gates (threshold semantics, §1.2)
      - { needsRepoDoc: [prd, frd, adr], before: { leave: backlog } }   # standard-on (D4); `docs_todo: true` satisfies it
      - { needs: research,  before: { leave: researching } }
      - { needs: impact,    before: { leave: researching } }
      - { needs: plan,      before: { leave: planning } }
      - { needs: checklist, before: { leave: planning } }              # implementation requires a plan (+ checklist)
      - { needs: post-implementation-report, before: { enter: review } }   # the reviewers' brief: what changed + why
      - { needs: proof, before: { enter: done } }   # verification evidence — today's proof-before-final-stage boundary, unchanged
  areas:                                     # sparse per-area overrides; absent area ⇒ inherits default
    pr-review:
      types: [ { id: pr-changes-summary, name: PR changes summary }, { id: pr-comments, name: PR comments },
               { id: pr-comment-disposition, name: Comment disposition }, { id: pr-review, name: PR review } ]
      gates: [ { needs: pr-comment-disposition, before: { leave: review } } ]
```

- Zod additions in `types.ts` (all optional/`default` so old boards load unchanged): `DocTypeSchema {id (lowercase-kebab), name, requires?, progress?}`, `GateRuleSchema {needs? xor needsRepoDoc?, before:{leave? xor enter?}}` (`.refine` the xors), `AreaDocsSchema {types?, gates?}`, `DocsConfigSchema {repoDocs, default, areas}` → `BoardConfigSchema.docs`. A `.refine` on each types list rejects `requires` entries naming unknown doc ids **and `requires` cycles** (`a requires b requires a`); Phase 4's `validateDraft` mirrors both checks.
- `docs.ts` houses `DEFAULT_DOC_TYPES`, `DEFAULT_GATES` (the two arrays above — also the fallback when `docs.default.types` is absent), plus pure resolvers `resolveDocTypes(board, areaId)` / `resolveGates(board, areaId)` = `docs.areas[areaId] ?? docs.default ?? DEFAULT_*`, and `repoDocKindOf(board, relPath)`. New standard doc types shipped by default: **`open-questions`**, **`post-implementation-report`** (request #5).
