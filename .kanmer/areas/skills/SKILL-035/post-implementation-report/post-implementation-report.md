# Post-implementation report

## Result

Kanmer now distinguishes retryable verification failures from explicitly disposed terminal failures. Non-PASS remains active in Verifying by default. Only an operator-declared irrecoverable or superseded result, with a reason and successor/no-successor disposition, may be retired: its truthful non-PASS proof is preserved, its Outcome records the disposition, it stays in Verifying, and it is archived, cleaned up, and released. It never enters Done.

`kanmer-closeout` accepts exactly the verified-Done/PASS shape or the archived-Verifying/non-PASS shape and refuses to invent the disposition. `kanmer-auto` stops on failure until the operator supplies that disposition, then routes through verify and closeout while reporting the result as retired non-success rather than cleared.

FRD-007 and FRD-015 now govern those semantics without adding a stage or field. The canonical, packaged, fallback, and repository AGENTS bodies all carry the same Done/PASS rule.

## Files changed

- `plugins/kanmer/skills/kanmer-verify/SKILL.md` — terminal-retirement decision and mutation order.
- `plugins/kanmer/skills/kanmer-closeout/SKILL.md` — verified-success and retired-failure closeout shapes.
- `plugins/kanmer/skills/kanmer-auto/SKILL.md` — explicit-disposition routing.
- `docs/functional/frd/FRD-007-fixed-six-stage-board.md` and `FRD-015-ticket-and-board-core.md` — durable stage/archive contract.
- `scripts/agents-block-body.mjs`, `plugins/kanmer/scripts/agents-block-body.mjs`, `plugins/kanmer/skills/kanmer-setup/SKILL.md`, and `AGENTS.md` — synchronized operating contract.
- `scripts/verify-skill-prose.mjs` — five semantic regression assertions.

## Verification

- Focused skill prose: initial exit 1 due three line-wrap-sensitive new regexes; corrected; subsequent exit 0.
- Focused AGENTS verification: initial exit 1 exposed the canonical body path; corrected; subsequent exit 0 (31/31).
- First authoritative `npm run verify`: exit 1 only at final `plugin:check`, after all earlier checks passed, because the packaged setup runtime copy was stale.
- `npm run plugin:build` and `npm run plugin:check`: exit 0; only the packaged body copy changed, not MCP bundle bytes.
- Second full `npm run verify`: exit 0. This includes build, 310 core tests, 477 GUI tests, 102 HTTP/remote tests, 116 script tests, workspace typecheck, docs, MCP smoke, 224/224 protocol/store checks, headless/MCPB/protocol/discovery checks, skill checks, 31/31 AGENTS checks, and plugin sync.
- `git diff --check`: exit 0.

## Deviations and residual risk

Planning initially named the wrapper rather than `scripts/agents-block-body.mjs` as canonical and omitted the packaged runtime copy. The focused and authoritative checks surfaced both; the ticket's files and plan documents were version-updated before proceeding. No schema, UI, stage, release, dependency, or package-version change was made.

CORE-103 has not been mutated. After this PR is independently reviewed, merged, and exact-SHA verified, it is the regression case for the shipped retirement path.
