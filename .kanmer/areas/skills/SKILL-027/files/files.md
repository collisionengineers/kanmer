# Files — SKILL-027

## Where the change lands

| Path | Why |
|---|---|
| `plugins/kanmer/skills/kanmer-groom/SKILL.md` | Add the board-vs-reality scan procedure: candidate scope, exact id/subject history searches, evidence inspection, conservative proposed dispositions, and current-board verification guidance. Preserve the Scan → Propose → Apply boundary. |
| `scripts/verify-skill-prose.mjs` | Add a narrow, dependency-free assertion that the groom skill still names the bounded history sweep and proposal-only disposition, so a later prose rewrite cannot silently remove it. |
| `scripts/verify-skill-prose.test.mjs` | Add a fixture regression test proving the verifier rejects a groom skill with the sweep contract removed or materially weakened. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `MASTERPLAN.md` S-33 | The exact requested scope: open Backlog/Preparing tickets, `main` history searched by id and subject, proposed Outcome/archive/rescope, and the CORE-028/GUI-076 motivation. |
| `plugins/kanmer/skills/kanmer-groom/SKILL.md` | Existing propose-then-apply safety rule, reversible archive convention, and current Scan/Propose/Apply structure to extend rather than replace. |
| `scripts/verify-skill-prose.mjs` | Existing portable verifier style, file walking, failure accounting, and output-as-evidence convention. |
| `scripts/verify-skill-prose.test.mjs` | Existing temporary-fixture pattern for asserting that a prose guard fails when its contract is violated. |
| `CORE-028` ticket Outcome and PRs #57/#59 | A fully shipped-yet-open historical example that should produce an archive proposal with evidence. |
| `GUI-076` ticket body and commit `9ec7741` | A partially pre-shipped historical example that should produce a rescope proposal, not an archive. |

## Ripple effects

- Future groom runs gain an auditable report section with candidate id, current stage, commit/PR evidence, evidence scope, and proposed archive/rescope/no-action result.
- The sweep relies on the local repository’s current `main` and optional GitHub access; unavailable history is reported as unavailable rather than treated as “not shipped.”
- `npm run verify:skills` and its node:test rail gain one focused guard/test. This is a skill-prose-only change, so no MCP bundle rebuild is needed.

## Out of scope

- MCP/core APIs, persistent scan state, ticket-frontmatter fields, automatic classification, automatic archive/rescope, status moves, or any live-board repair.
- Reopening/altering CORE-028 or GUI-076 to fabricate a test case.
- Broad board grooming beyond the new evidence-gathering procedure.
