---
id: CORE-139
type: ticket
title: >-
  Stop workflow_dispatch from running the full verify rail and fix the shipped
  skill link and AGENTS block sentence
status: backlog
area: core
assignee: ''
profile: fix
labels:
  - ci
  - skills
  - 0.4.1
links:
  - GUI-149
  - CORE-138
  - SKILL-039
refs:
  - docs/functional/frd/FRD-023-agent-skills-system.md
  - docs/functional/frd/FRD-013-setup-as-reconciliation.md
archived: false
created: '2026-09-03T18:59:42.801Z'
updated: '2026-09-03T18:59:42.801Z'
---

## What

Stop a board-branch push from running Kanmer's full Windows verification rail, coalesce re-gate dispatches, and fix two shipped artefacts that break every repository Kanmer is installed into: the monorepo-relative link in the `kanmer-setup` skill and the truncated sentence in the canonical AGENTS.md managed block.

## Why

`board-regate.yml` (installed on `kanmer-board`) dispatches `pr.yml --ref main` on every board push, and `verify.if` (`github.event.action != 'edited' && (github.event_name == 'pull_request' || github.ref == 'refs/heads/main')`) is true for a `workflow_dispatch` on main. Observed 2026-09-03: 53 of the last 60 `pr.yml` runs were dispatches, 25 of them on the same SHA `cd5b6b6b`, each running the ~9-minute `verify` job that only re-proves an already-proven commit. Neither workflow declares `concurrency`, so bursts queue instead of collapsing, and the dispatcher never checks whether an open PR exists to re-gate.

Separately, `plugins/kanmer/skills/kanmer-setup/SKILL.md:169` links `../../../../docs/manual/greenfield.md`, a path that resolves only inside this monorepo. Pegasus commits the copied skill trees, so its `documentation` job has been red since 2026-09-03 10:12Z (`BROKEN .opencode/skills/kanmer-setup/SKILL.md: ../../../../docs/manual/greenfield.md`) and every PR since inherits the failure; one PR was merged on red because of it. The canonical AGENTS block body (`scripts/agents-block-body.mjs:60`, mirrored in the skill) also ends a sentence with a dangling `Native` left behind by GUI-141's rewrite of the tunnel paragraph, and that word is now in every consuming repo's AGENTS.md.

A rail regression in the same family: `scripts/verify-skill-prose.test.mjs` asserts only `status != 0` on the validator child, which `null` (spawn failure) satisfies, so a spawn failure is reported as a validator miss with empty output (GUI-149 verify run 6).

## Approach

- `pr.yml`: `verify.if` = `(github.event_name == 'pull_request' && github.event.action != 'edited') || (github.event_name == 'push' && github.ref == 'refs/heads/main')`; workflow-level `concurrency` keyed by workflow + event + PR number/ref, `cancel-in-progress` for everything except `push` (the push-to-main run is the post-merge receipt and is never cancelled).
- `board-regate.yml`: its own concurrency group with `cancel-in-progress: true`, `pull-requests: read`, and a `gh pr list --base main --state open` guard before `gh workflow run`. The in-`regate` guard stays as defence in depth.
- `scripts/pr-workflow.test.mjs`: positive assertion on the new `if`, a negative assertion that `verify.if` contains no unqualified `github.ref == 'refs/heads/main'` and no `workflow_dispatch`, both concurrency blocks, and the upstream guard.
- `kanmer-setup/SKILL.md:169`: unlinked reference to the manual; new `verify-skill-prose.mjs` check that no shipped skill contains a relative link escaping its own skill folder, with a mutation test.
- Remove the dangling `Native` from the canonical block (`scripts/agents-block-body.mjs`, the skill's fenced copy) and refresh this repo's AGENTS.md block; `npm run plugin:build` refreshes the packaged setup runtime.
- `verify-skill-prose.test.mjs`: every validator spawn asserts `result.error === undefined` and non-empty stdout before asserting on FAIL lines.
- AGENTS.md §6: `workflow_dispatch` runs only `regate`; the board hook dispatches only when an open PR exists; operator step to re-copy `board-regate.yml` onto the board branch.

Out of scope (0.4.2): a staleness row for the operator-installed board-regate copy; build-once / tiered rail; receipts.

## Verification

- [ ] `node --test scripts/pr-workflow.test.mjs` green with the new positive and negative assertions.
- [ ] After the operator re-copies `board-regate.yml`, a board push produces a `pr.yml` run whose only executed job is `regate` (`verify` skipped); a board push with no open PR into main dispatches nothing; two board pushes within a minute leave one board-regate run.
- [ ] `npm run verify:skills` fails on a fixture skill containing `](../x.md)` and passes on the shipped tree.
- [ ] `node scripts/verify-agents-block.mjs` green; `grep -c 'launcher. Native' AGENTS.md scripts/agents-block-body.mjs plugins/kanmer/skills/kanmer-setup/SKILL.md` = 0.
- [ ] `npm run verify` green.

## Outcome
