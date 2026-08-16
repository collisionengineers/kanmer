# 8.2 Templates — M (requests #2, #5)

- **New:** `open-questions`, `post-implementation-report` (the Implementing→Review brief), the 4 PR-review docs, `prd`/`frd`/`adr`, `doc-structure`, `scratch`.
- **Changed:** `research-template` (drop the Open-questions section → pointer), `ticket-template` (Governing-docs section; scratch note), `plan-template` (mandatory **Governing docs** section — meets / modifies-with-authorization / new-doc rationale — plus ADR callout + plan-gate), `impact`/`checklist` (stage-name refresh), `proof` (now the **Verifying→Done** evidence, gathered on merged main), `closeout-checklist` (+ proof-finalized line), `pr-template` (clarify it's the PR *description*, distinct from the 4 review docs).
- **UI-area assets:** screenshot "docs" (`mockups`, `live-screenshots`, `verification-screenshots`) are markdown files embedding images stored in an `assets/` subfolder of the ticket folder — establish the convention in the templates and exclude `assets/` from any doc scan.
- Per-area default doc-sets (Bugs / PR review / UI / Documentation / generic) — see [`rationalization.md`](rationalization.md) and the Phase 1 `docs.default`/`docs.areas` config.
