# Proof — SKILL-033

## Merged-main identity and traceability

- PR [#243](https://github.com/collisionengineers/kanmer/pull/243) is merged by normal protected squash flow.
- GitHub and the detached verification clone both identified current `main` as `2db5989682d6885612d62af4e5da8dafe013a33f`, the merge commit for this ticket.
- Its parent is `be15545a90af27f08e2124e7aaf39c4bcc3b51dc`. `git diff --check be15545a90af27f08e2124e7aaf39c4bcc3b51dc 2db5989682d6885612d62af4e5da8dafe013a33f` exited **0** and the exact changed paths are `AGENTS.md` and `plugins/kanmer/skills/kanmer-review/SKILL.md`.
- The PR source head `6c4432fc3a6c06d75ab3fd8cdbd2c237d8da092d` is not an ancestor of main, as expected after a squash merge. The ticket trace therefore records the reachable merge SHA `2db5989682d6885612d62af4e5da8dafe013a33f`; `git merge-base --is-ancestor 2db5989682d6885612d62af4e5da8dafe013a33f origin/main` exited **0**.

## Merged-main verification

All commands below ran in a clean, disposable detached clone at the merge SHA; no user checkout or board source file was modified.

| Command | Exit | Result |
| --- | ---: | --- |
| `npm ci --ignore-scripts` | 0 | Dependencies installed without lifecycle scripts. npm reported its existing audit advisory; no dependency was changed. |
| `npm run verify:skills` | 0 | All 15 prose-contract sections passed, including the current whole-file `scratch/review.md` review-record flow. |
| `npm run verify:agents-block` | 0 | 31/31 checks passed, including the canonical managed block and this repository's AGENTS block. |
| `npm run build && npm run plugin:check` | 0 | Core and MCP builds passed; plugin sync reported 37 matching tools, matching bundle bytes, 12 parsed skill frontmatters, v0.3.3 manifests, and a 37-tool isolated MCP handshake. |
| `git diff --check <merge-parent> <merge-sha>` plus exact changed-path assertion | 0 | No whitespace error and exactly the two planned documentation paths. |
| Read-only Node semantic assertion over merged files | 0 | `{"managedBlockAtStart":true,"guidanceOutsideManagedBlock":true,"roleBoundaryInSkill":true,"selfReviewStillProhibited":true,"githubPolicyRetained":true,"distinctCredentialRequirementAbsent":true}`. |

The semantic assertion independently checked that the AGENTS clarification is outside the managed block; that both sources define independence as an agent-role rather than a credential boundary; that authors remain prohibited from self-review/self-merge; that GitHub policy remains authoritative; and that no distinct-account requirement is asserted.

## Hosted and review evidence

The protected branch requires `verify` and `kanmer-gate`. Both completed successfully for reviewed PR head `6c4432fc3a6c06d75ab3fd8cdbd2c237d8da092d`. Independent exact-head review is recorded in `scratch/review.md`; GitHub reported no issue comments, PR review comments, reviews, or GraphQL review threads before the normal merge.

## Inconclusive fixture-command attempts retained for honesty

No product check failed. Three early local command sequences were not valid checks and were corrected rather than treated as passes:

1. Running `npm run plugin:check` immediately after `npm ci --ignore-scripts` exited 1 because the disposable clone had no built `@kanmer/core` artifact.
2. Running it after only `npm run build:core` exited 1 because its byte-sync contract also requires the standalone MCP bundle.
3. Two ad-hoc literal prose assertions exited 1 because their test strings did not normalize Markdown wrapping/backticks; the final source-aware semantic assertion above exited 0.

The proper `npm run build && npm run plugin:check` sequence and the final assertion are the recorded passing evidence; the invalid early attempts are not concealed.

## Result

**PASS.** The exact merged main result satisfies the SKILL-033 acceptance criteria and the relevant precise prose/skill verification. Closeout, release, and branch/worktree cleanup are deliberately not performed in this verification step.
