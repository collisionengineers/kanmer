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
