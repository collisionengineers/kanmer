# opencode + Antigravity project skills — research

The code carried a comment saying opencode's only documented skills fallback was
`~/.claude/skills` — Claude's *global* directory — and that writing there would
duplicate skills across every project, so v1 relied on the AGENTS block.

That was wrong, and it is the same stale-fact failure ADR-0009 was written
after. Verified 2026-08-16 against opencode's current docs, its search order is:

1. `.opencode/skills/` (project)
2. `~/.config/opencode/skills/`
3. `.claude/skills/` (project)
4. `~/.claude/skills/`
5. **`.agents/skills/` (project)**
6. `~/.agents/skills/`

Position 5 is project-scoped and host-neutral. Antigravity's docs put
`.agents/skills` as its *primary* location (`.agent/` singular kept only for
backward compatibility). So one project-scoped write serves both hosts, with
nothing landing in a global directory.

Frontmatter is compatible without change: opencode requires `name` and
`description` and requires the name to match its directory; Antigravity requires
`description` with `name` optional. Kanmer's roster satisfies both already.

Grok is the exception and stays as it is — it reads `./.grok/skills/`,
`<repo>/.grok/skills/`, `~/.grok/skills/` and `~/.claude/skills/`, but **not**
`.agents/skills`. The convergence is two hosts, not three.
