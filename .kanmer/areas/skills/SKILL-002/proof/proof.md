# Proof

PR [#18](https://github.com/collisionengineers/kanmer/pull/18), merged on GitHub
(`78ee829`). Verified on the merged base.

## The exit criterion, run

The ticket names it: every shipped template's identity line, grep-able.

```sh
for f in plugins/kanmer/skills/*/assets/*template*.md; do
  sed -n '3p' "$f" | grep -q '^\*.*Not ' || echo "MISSING: $f"
done
```

**No output** across **14** templates. Line 3 because line 1 is the heading and
line 2 is blank — the fixed position is what makes this checkable rather than a
matter of reading each file.

## Other checks

| Check | Result |
|---|---|
| Templates containing `priority` | **0** |
| `files-template.md` containing "Impact" | **0** — the SKILL-001 loose end is closed |
| Template count | 14 (12 before, +2 proof flavours) |
| `verify:agents-block` | 26/26 |

## Not proven

**Whether the distinctions are drawn in the right place.** The grep proves every
template *has* an identity line. It cannot prove the line is correct. These are
one-line judgements that will be read far more often than they were written, and
`report ↔ proof` and `research ↔ files` are my phrasing of a subtler split
than the FRDs state outright.

**Whether they change behaviour.** The premise is that an agent reading "Not the
Y" writes a different document. Untestable here, and it is the entire point.

**Two items from the ticket were deliberately not built** — a deep-mode research
summary template (FRD-005's deep mode landed in SKILL-001 without a summary
concept, so the template would be for nothing) and a group template (groups have
no `assets/` file; `create_group` takes title and body directly). Both are
argued in the report rather than silently dropped.
