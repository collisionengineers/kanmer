# Phase 8 — Skills, templates & onboarding

**Goal:** rewrite the skill roster and templates for the 7-stage flow, the per-area doc model, hard gates, scratch notes, `refs`, and traceability; add PRD/FRD/ADR governance and a brief-first greenfield onboarding; and rationalize the skill/tool set. Net **12 → 13 skills**. See [`rationalization.md`](rationalization.md) for the 5 meta-question answers and [`docs-template.md`](docs-template.md) for the `/docs/` tree.

**Depends on:** Phases 1–2 (frozen tool signatures — do not start skill rewrites until the schemas are stable). **Scope:** `plugins/kanmer/skills/**`, `assets/**`, `references/tool-reference.md`, the `kanmer-setup` AGENTS.md block.

## The gate model the skills target (core-enforced; default config, fully customizable per board/area)

> This table describes the workflow the shipped skills drive on **end-user repos'** boards — it is *not* the process for developing kanmer itself (this repo carries no `.kanmer/` board).

| Transition | Hard gate (Phase 1 defaults) | Producing skill |
|---|---|---|
| Backlog → Researching | governing PRD/FRD/ADR linked (`refs`) **or** `docs_todo` "new doc to be created" set (request #13) — standard-on; setup can disable | kanmer-tickets / kanmer-docs |
| Researching → Planning | `research.md` + `impact.md` exist | kanmer-research |
| Planning → Implementing | `plan.md` + `checklist.md` exist | kanmer-plan |
| Implementing → Review | `post-implementation-report.md` exists (the reviewers' brief: every file change + rationale) | kanmer-execute |
| Verifying → Done | `proof.md` exists (verification evidence on merged main) | kanmer-verify |

**Stage contract (merge point):** Review pass → **the PR is merged** → the ticket enters Verifying. `kanmer-verify` validates the shipped result **on merged main** and writes `proof.md`; Done follows; `kanmer-closeout` then does git cleanup + release. This contract goes verbatim into the AGENTS.md managed block.

## Items

### 8.1 Per-skill changes (12 → 13) — L
- **`kanmer-tickets` (U):** "Creating tickets" gains the **link-or-create governing PRD/FRD/ADR** step (`refs`/`docs_todo`); stage names → 7; proof-gate wording → per-area gate model; scratch note; router table updated for the merges/new skills.
- **`kanmer-research` (U):** move to **Researching** (not `planning`); docs = `research`+`impact`+**`open-questions`** (promoted from a section); working notes → `append_scratch`; link/create the governing FRD.
- **`kanmer-plan` (U):** **plan+checklist gate leaving Planning** — after both exist and the user approves, check `get_doc_gates` before `move_item`. `plan.md` gains a mandatory **Governing docs** section (via the template): how the plan meets each linked PRD/FRD/ADR, or — with explicit authorization — how it modifies them, or why a new one is being created (gates check existence only; this content rule is enforced here and checked by `kanmer-review`). Design decisions become **ADRs** (via `kanmer-docs`), linked into `refs`.
- **`kanmer-execute` (U):** worktree model unchanged; at completion writes **`post-implementation-report.md`** (every file change + rationale, request #5 — the reviewers' brief, now gating **Implementing→Review**); record `commits`/`prs` on the ticket (request #16); scratch working notes; open the PR; then → Review.
- **`kanmer-review` (U):** writes the **4-doc PR-review set** (`pr-changes-summary`, `pr-comments`, `pr-comment-disposition`, `pr-review`) instead of ad-hoc notes; verifies the plan's Governing-docs section holds; on pass **the PR is merged** and the ticket moves to **Verifying** (stage contract above). Sole owner of PR-feedback→tickets (`kanmer-import` delegates here).
- **`kanmer-verify` (N):** the Verifying stage — validates the shipped behaviour **on merged main** and writes **`proof.md`** (verification evidence — commands run, output, screenshots); this doc is the **Verifying→Done** gate. Symmetric with the other phase skills.
- **`kanmer-closeout` (U):** post-merge only; verify `proof.md` finalized; record merge + set `deployment` (request #16); then git cleanup + release.
- **`kanmer-docs` (N):** cross-cutting owner of the repo `/docs/` tree — PRD/FRD/ADR authoring/numbering/linking, the `doc-structure.md` template, and the link-or-create rule. Reused by setup (bulk) and research/plan/tickets (per-ticket).
- **`kanmer-setup` (U):** greenfield rewritten to the brief→docs→board flow (§8.3); seeds the 4 built-in areas with default doc-sets; **AGENTS.md managed block fully rewritten** (7 stages, doc model, scratch, gates, `refs`, traceability, the 13-skill roster) — the highest-leverage single edit, inherited by every downstream repo.
- **`kanmer-auto` (U):** wave model → 7 stages + gate-aware (reads `get_doc_gates`; a lane can't leave Planning without `plan.md`+`checklist.md`, enter Review without the report, or reach Done without `proof.md`).
- **`kanmer-report` (M = standup + retro):** one read-only reporting skill, two modes (`now` / `since <period>`) — same four read tools, differ only by time window.
- **`kanmer-groom` (U):** adds a triage class — **doc-gate debt** (tickets `docs_todo:true` still unlinked, or missing a required doc).
- **`kanmer-import` (U):** keeps idempotent issue import; **loses** the PR-comment path (delegates to `kanmer-review`); imported tickets get `docs_todo:true`.

### 8.2 Templates — M (requests #2, #5)
- **New:** `open-questions`, `post-implementation-report` (the Implementing→Review brief), the 4 PR-review docs, `prd`/`frd`/`adr`, `doc-structure`, `scratch`.
- **Changed:** `research-template` (drop the Open-questions section → pointer), `ticket-template` (Governing-docs section; scratch note), `plan-template` (mandatory **Governing docs** section — meets / modifies-with-authorization / new-doc rationale — plus ADR callout + plan-gate), `impact`/`checklist` (stage-name refresh), `proof` (now the **Verifying→Done** evidence, gathered on merged main), `closeout-checklist` (+ proof-finalized line), `pr-template` (clarify it's the PR *description*, distinct from the 4 review docs).
- **UI-area assets:** screenshot "docs" (`mockups`, `live-screenshots`, `verification-screenshots`) are markdown files embedding images stored in an `assets/` subfolder of the ticket folder — establish the convention in the templates and exclude `assets/` from any doc scan.
- Per-area default doc-sets (Bugs / PR review / UI / Documentation / generic) — see [`rationalization.md`](rationalization.md) and the Phase 1 `docs.default`/`docs.areas` config.

### 8.3 Onboarding (greenfield full-repo) — L (request #14)
Six phases in `kanmer-setup`: (0) detect + require a **user brief**; (1) annotate → `docs/product/vision.md`; (2) split each span into **PRD/FRD/ADR** (via `kanmer-docs`), unresolved → `docs/product/open-questions.md`; (3) materialize the ideal **`/docs/` tree** + `docs/contributing/doc-structure.md` (see [`docs-template.md`](docs-template.md)); (4) area/stage/backlog setup — the 4 built-in areas + FRD/ADR-derived areas, one ticket per FRD acceptance-criterion/ADR-consequence, **each created with `refs`** to the doc it implements (request #13) — **preceded by a preview with counts** (N PRDs → M FRDs → K tickets) that the user confirms before anything is created, since a real brief can yield 100+ tickets; (5) wire (`.worktrees/` gitignored, AGENTS.md block) + report the doc→ticket link map. Brownfield/upgrade keep current behaviour + a `/docs/` skeleton; upgrade tickets get `docs_todo:true` so the new gate doesn't retroactively block them; setup asks whether to keep the PRD/FRD/ADR gate on (default) or disable it for repos that decline `/docs/`.

## Release rail
The hard sync (AGENTS.md §7): every new/changed tool from Phase 2 has a `references/tool-reference.md` row (the 4 new tools **must**, or `plugin:check` fails); doc-enum rows → "dynamic per-area"; field-semantics list → 7 stages + `refs`/`commits`/`prs`/`deployment`. Then `npm run plugin:build` + `npm run plugin:check`. Sequence: author `kanmer-docs` (+ prd/frd/adr/doc-structure templates) **before** finalizing the setup rewrite; make `kanmer-review` own PR feedback **before** trimming `kanmer-import`.

## Verification
- `npm run plugin:check` (24 tools matched); `npm test`; `node packages/mcp-server/src/smoke.mjs` (new gate/doc assertions).
- Dry-run onboarding against a scratch repo: a brief produces `/docs/` PRD/FRD/ADR + `doc-structure.md`, areas/stages/backlog, and tickets carrying `refs`.
- Each rewritten skill references the correct 7 stages and gates; the AGENTS.md managed block round-trips idempotently and matches the Connect block-writer (Phase 6).
