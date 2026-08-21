# Checklist

- [x] `kanmer-import/` deleted; cross-refs in review + tickets removed
- [x] six stage names everywhere (`researching`/`planning` → `preparing`)
- [x] `impact.md` → `files/` in research, plan, review, auto
- [x] priority references removed from the skill roster (tickets, groom, auto, setup)
- [x] kanmer-review's 4 docs → `append_scratch` slug `review`
- [x] kanmer-auto partitions on `files/`, not `impact.md`
- [x] kanmer-auto reads each ticket's profile instead of assuming the feature pipeline
- [x] kanmer-tickets skills table lists 12
- [x] kanmer-setup: stages + priority only (reconciliation is SKILL-004)
- [x] `move_item` tool description states the one-gated-boundary rule
- [x] `tool-reference.md` matches the new description
- [x] README skills table → 12
- [x] `docs_todo` and `link_doc` left intact — verified still live
- [x] semantic skill-prose exit rail (`npm run verify:skills`) returns zero; the broad historical grep's ordinary-English and SKILL-005 AGENTS-block hits are not gate rules
- [x] `verify:agents-block` still passes
- [x] `plugin:build` + `plugin:check`

## Reconciliation evidence

The scoped implementation is already present on the current merged base: commit `130f837e34119af80532b4f5ccb17add896c56c8` is reachable through merge `8af1991c8350ae4bf7b44532dd434ee24ce7b8e4` from `cfd2e35aa7fbff1807fccd32caadf64442b2c70a`. This fresh worktree therefore has no duplicate source diff.

Fresh checks: `npm run verify:skills` exit 0; `npm run verify:agents-block` exit 0 (31/31); `npm run test:scripts` exit 0 (79/79); `npm run typecheck` exit 0; local-workspace `npm run plugin:build` exit 0 and `npm run plugin:check` exit 0 (30 tools, 12 skill frontmatters, matching bundle bytes). The initial linked-worktree `plugin:check` exit 1 is retained in the report as an environment failure; it resolved after this checkout received local workspace links. The generated bundle was restored because no source change belongs in this reconciliation.
