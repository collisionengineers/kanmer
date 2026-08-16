# Post-implementation report

Both hosts read one project-scoped tree.

**For review:** the tree is now shared, so `removeBundledSkillsOnly` matters
more than it did. Disconnecting one host removes the bundled skill folders from
`.agents/skills` — which the *other* host is also reading. Today that is
correct-by-construction, because both hosts are given identical content and the
AGENTS block is retained while a peer is still registered
(`hasRegisteredCopySkillsPeer`). Worth confirming that peer check covers the
skills copy too and not only the block.

**Recorded but not fixed** (belongs to Connect, not here): Grok filters
repo-scoped skills through `.gitignore`. A repo that ignores `.grok/` — common —
silently loses the whole roster with no error. Kanmer does not cause it, but
Connect should warn when the install path lands ignored. Noted in GUI-004's
research.
