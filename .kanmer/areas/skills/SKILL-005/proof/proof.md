# Proof

PR [#16](https://github.com/collisionengineers/kanmer/pull/16), merged on GitHub
(`5c1bfb5`). Verified on the merged base after fast-forwarding.

## Checks

| Check | Result |
|---|---|
| `verify:agents-block` | **26/26**, including "SKILL.md's fenced block body matches this script's" |
| v2 residue in the block (`researching`, `planning`, `impact.md`, `kanmer-import`) | **0** |
| `node scripts/agents-block.mjs .` run twice | second run changes nothing |
| `git status AGENTS.md` after regeneration | clean — the committed file already matches what the script produces |

That last one is the one worth having: the repo's own `AGENTS.md` is not a
hand-written copy that happens to look right, it is byte-identical to the
script's output.

## The byte-identity check earned its keep

My first edit to `BLOCK_BODY` truncated the template literal — the old body
contained an escaped backtick immediately before a semicolon
(`` \`<id>-<slug>\`; ``), which my end-marker search matched as the end of the
literal. The result was a syntax error, caught immediately.

The second attempt bounded the literal by the declaration that follows it. Both
copies are now written from one source string in a single pass, so they cannot
diverge at the moment of editing — the assertion only has to catch drift later.

## Not proven

**No agent has been onboarded with the new block.** The correctness argument is
that it no longer names anything the board rejects, which is checkable and
checked. Whether it actually produces better behaviour — an agent calling
`get_doc_gates` instead of assuming six documents — is not something this repo
can test, and is the whole point of the change.

**The skills roster is still a hand-maintained list of names.** It has now been
wrong twice. Nothing here prevents a third time; a `list_skills` tool would, and
does not exist.

## Merged-main verification — 2026-08-22

Verification ran against the merged `main` line. Git confirmed implementation commit `21b53a7beb689abca3c7256b557423d014ab7c90` is an ancestor of `origin/main`; `gh pr view 16` confirmed state MERGED, merge commit `5c1bfb5ed5db323dcdb90efa3a5531a5953598a3`, merged 2026-08-16T05:15:03Z. The canonical `BLOCK_BODY`, setup skill fenced copy, and generated `AGENTS.md` are present on merged main.

Fresh merged-main checks:

- `npm run verify:agents-block` — exit 0; 31/31 PASS, including byte identity between `BLOCK_BODY` and the setup skill, current AGENTS block, and canonical GUI import.
- `npm run verify:skills` — exit 0; all 13 skill-prose sections PASS.
- `node scripts/agents-block.mjs .` first run — exit 0; generated AGENTS output is current.
- `git diff -- AGENTS.md` after first run — clean.
- `node scripts/agents-block.mjs .` second run — exit 0; no-op.
- `git diff -- AGENTS.md` after second run — clean.
- `git diff --check` — exit 0.
- Fresh worktree is clean; no source changes were required for this reconciliation.

The historical first `npm run test:scripts` failure (78/80, missing `packages/core/dist/index.js` for `auto-run-state.test.mjs` and `release-notes.mjs`) remains recorded in the report; its later `npm run build:core` and 80/80 rerun do not erase that first-run limitation. No new full-root-verify claim is made.

No live agent onboarding or behavioral improvement is claimed: the block's static correctness is proven, while whether agents call `get_doc_gates` instead of assuming a pipeline remains untestable here. The roster remains hand-maintained.

## Closeout finalisation — 2026-08-22

PR [#16](https://github.com/collisionengineers/kanmer/pull/16) is MERGED (2026-08-16T05:15:03Z) at merge commit `5c1bfb5ed5db323dcdb90efa3a5531a5953598a3`. The historical first-run missing-dist failure and unproven live onboarding limits remain explicit; no stronger claim is made.
