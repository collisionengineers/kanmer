## OPERATOR ANSWER — 2026-08-16

**Open question 1 ("May `scripts/release.mjs` be changed so the release commit
contains a rebuilt MCP bundle, not just the version bump?") is ANSWERED: YES.**

The operator selected the rebuild-in-the-release-commit option:

```
gate: build + plugin:check
bump: root + apps/gui
+ NEW: npm run build
+ NEW: node scripts/build-plugin.mjs
commit: bump AND bundle
pack
```

What this settles:

- **A build-time version stamp is authorised.** `get_status` reports a real
  release number, not only a hash.
- **`release.mjs` gains a rebuild step after the version bump and before the
  pack**, so the release commit carries the regenerated bundle. Without it,
  v0.3.3 would ship a bundle reporting 0.3.2 and the next `plugin:check` would
  fail against a now-stale committed bundle.
- **Two existing rules are deliberately widened, and both must be updated in
  prose, not silently:**
  - the comment at `release.mjs:151-152` ("NOT `plugin:build` — that rewrites the
    committed bundle, which would dirty the tree mid-release") argues against
    exactly this change. Rewrite it to say why the order is now bump → rebuild →
    commit, rather than deleting it.
  - the rule at `release.mjs:115` that "the release commit must contain only the
    version bump" now reads: the version bump **and** the artifacts derived from
    it. Say so explicitly.
- **The release rail is the ticket's real risk, not the `get_status` diff.** Treat
  `scripts/release.mjs` as the HIGH-risk file the research doc already marks it.

**Still required regardless of the version field:** the stamp must be a pure
function of the source tree, because `check-plugin-sync.mjs:57-76` compares the
committed bundle byte-for-byte with a fresh build. A build timestamp breaks that
every build; an embedded git sha breaks it every commit (the bundle is committed,
so the embedded sha is always the parent's). Keep the runtime self-sha256 of the
running script as the identity that needs no build cooperation — it reproduces the
observed `e92a2679` vs `96fe9f8a` divergence directly. Neither tsup config sets
`shims`; check `__filename` / `import.meta.url` availability before relying on it.

**Also report `repoRoot`.** Research found a second silent divergence: codex passes
`--repo-root` and `.mcp.json` does not, and `repoRoot` — what governing-doc `refs`
resolve against — is not reported by `get_status` at all. It belongs in the same
identity block.

Open question 2 (sequencing behind MCP-010) was answered in the scheduling note
beside this one: **MCP-012 waits; lane A is MCP-010 → MCP-012 → CORE-023.**
