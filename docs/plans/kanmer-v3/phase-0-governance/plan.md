# Phase 0 — Governance docs & backfill verification

**Goal:** land the durable documentation set in the repo (`/docs/` per the docs-template tree) with every backfill claim verified against code — so later phases build on accurate pre-existing documentation (the user's explicit requirement).

**Depends on:** nothing. **Feeds:** everything (FRDs are the spec the phases implement; the manual is generated from them in Phase 5).

## Items

### 0.1 Land the tree — S
- `docs/product/vision.md`, `docs/product/prd/PRD-001`, `docs/architecture/adr/ADR-0001…0010`, `docs/functional/frd/FRD-001…024`, `docs/README.md` (index + numbering/status conventions per the shipped docs-template). Shaping record archived under `docs/plans/kanmer-v3/shaping.md`.

### 0.2 Verify the backfill FRDs (015–023) against code — M
- The audit discipline applied to our own docs: every claim in the nine backfill FRDs spot-checked to `file:line` (store.ts, kanmerGit.ts, providers.ts, main/index.ts, App.tsx, MCP index.ts, activity.ts, watch.ts, updater). Corrections applied in place; each FRD's status flips draft → approved only after its pass.

### 0.3 Seed the roadmap onto the existing v2 board — M
- One ticket per phase **item** (2.1, 2.2, … as written in these plans), created on Kanmer's current board via the existing tools/skills: title from the item, body pointing at the plan section + governing FRD(s) via `refs` (the FRDs land in 0.1, so the v2 leave-Backlog gate is satisfiable properly), `blocks:` edges from the Depends lines, a `v3-phase-N` label per phase (groups don't exist yet — labels stand in until Phase 7 converts them), and phase-plan cross-links (`[[ID]]`) recorded back into each plan's items. From here on, **this roadmap is worked ticket-first through the shipped v2 pipeline** — each ticket earns its own research/impact/plan/checklist/proof under the current gates. This item is why the phase plans are briefs, not per-file specs.

### 0.4 Wire the mirror — S
- `docs/contributing/doc-structure.md` regenerated as the human-readable mirror (FRD-014 R4); AGENTS.md gains a one-line pointer to `/docs/` as the governance source.

## Release rail
None (docs only; plugin untouched).

## Verification
- Every relative link in `/docs/` resolves; `npm test` untouched and green; a reviewer can navigate PRD → FRD → ADR for any v3 feature; 0.2's file:line notes recorded in each FRD's footer.
