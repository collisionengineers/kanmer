# Proof

PR [#19](https://github.com/collisionengineers/kanmer/pull/19), merged
(`aacd09f`). Verified on the merged base.

## Checks

| Check | Result |
|---|---|
| Skill's table vs `docs/README.md` | **identical** (diffed, not eyeballed) |
| Widened residue grep (`\bimpact\b`, `kanmer-import`) across all 12 skills | **0 files** |
| `verify:agents-block` | 26/26 |

The widened grep is the meaningful one. SKILL-001's version matched `impact\.md`
and returned clean while two bare `impact` references survived. `\bimpact\b`
catches both forms and now returns nothing anywhere in the roster.

## The defect this actually fixed

Not "wrong paths" — the skill stated `DEFAULT_REPO_DOCS`, which is correct for a
fresh repo. It hardcoded a **configurable** value. On this board:

```
repoDocs:
  prd: docs/product/prd/**
```

an agent following the old text writes to `docs/prd/` — classified by no glob —
or links a path `assertRefs` rejects. That is not hypothetical: it happened
during this session and was recorded at the time as an authoring mistake.

The skill now says to read the globs from `get_doc_gates` and treats the
defaults as an example.

## Not proven

**The duplicated table has no automated guard.** It matches today because it was
diffed today. `docs/README.md` and the skill can drift tomorrow with nothing to
catch it — the AGENTS block has a byte-identity assertion for exactly this and
this pair does not. A deliberate call, and the weakest point in this ticket.

**Nothing prevents the next too-narrow exit grep.** This ticket fixed the misses
from one; the general problem — "zero hits" being only as strong as the pattern
— is unaddressed.

**No agent has authored a governing doc under the new instructions.** The
correctness claim is that the skill no longer states a path this board rejects,
which is checkable and checked. Whether an agent actually calls `get_doc_gates`
for the globs rather than reusing the example is not.
