## Research evidence log (MCP-007) — 2026-08-16

Profile is `fix`: gates ask for `files` + `plan` only. No `research` doc owed, so the
signal-verification evidence lives here.

### Signals, measured in both roots (not inferred)

Main checkout — `C:/Users/PC/Documents/GitHub/kanmer`:

```
git rev-parse --git-dir          -> .git            (relative)
git rev-parse --git-common-dir   -> .git            (relative)
git rev-parse --show-toplevel    -> C:/Users/PC/Documents/GitHub/kanmer
statSync(".git").isFile()        -> false   isDirectory() -> true
existsSync("node_modules")       -> true
```

Worktree — `C:/Users/PC/Documents/GitHub/kanmer/.worktrees/kanmer`:

```
git rev-parse --git-dir          -> C:/Users/PC/Documents/GitHub/kanmer/.git/worktrees/kanmer   (absolute)
git rev-parse --git-common-dir   -> C:/Users/PC/Documents/GitHub/kanmer/.git                    (absolute)
git rev-parse --show-toplevel    -> C:/Users/PC/Documents/GitHub/kanmer/.worktrees/kanmer
statSync(".git").isFile()        -> true    isDirectory() -> false
cat .git                         -> "gitdir: C:/Users/PC/Documents/GitHub/kanmer/.git/worktrees/kanmer"
existsSync("node_modules")       -> false
```

`git worktree list` confirms two entries: the main checkout on `main`, and
`.worktrees/kanmer` on `kanmer-board`.

### Signal ranking

1. **`--git-dir` !== `--git-common-dir`** — the canonical, git-defined worktree test.
   Exactly true in a linked worktree, exactly false everywhere else, including a
   `git clone --separate-git-dir` checkout (where both point at the same relocated
   dir). Costs one subprocess. **Recommended primary.**
   Trap: the two can come back one relative and one absolute — `path.resolve(root, x)`
   both before comparing, and pass `{ cwd: root }` so the answer describes the tree the
   script belongs to, not the shell's cwd.
2. **`.git` is a file, not a directory** — no subprocess, works with git off PATH.
   A superset: also fires for submodules and `--separate-git-dir`. Good fallback when
   the `git` spawn throws.
3. **`node_modules` absent at root** — this is the actual causal mechanism (module
   resolution escaping upward to main's workspace symlink), but it is a poor *signal*:
   it is equally true of a fresh clone before `npm install`, where the failure is loud
   (tsup isn't installed) rather than silent. Redundant once (1) is in place.
4. **`.worktrees/` path segment** — what the ticket body proposes. Rejected as primary:
   it only recognises worktrees this repo's own convention created. A worktree made by
   hand anywhere else is the same defect and would sail through.
5. **Embedded tsup path comments (`../../node_modules` vs `../../../../node_modules`)** —
   confirmed present in the committed bundle (`../../node_modules/@modelcontextprotocol/...`),
   so the root-built depth really is 2. Usable as a corroborating assertion, but it is
   tsup-comment-formatting-dependent and would silently stop working on a toolchain bump.
   Not a load-bearing signal.

### Why the check is meaningless in a worktree (mechanism, restated from source)

`check-plugin-sync.mjs:72-76` sha256s the committed `plugins/kanmer/mcp/kanmer-mcp.cjs`
against `packages/mcp-server/dist/standalone/kanmer-mcp.cjs`. Inside a worktree the
fresh build was produced with the *same* wrong resolution as the committed one, so the
hashes agree and the check reports OK. The comparison is only meaningful when the
artifact was produced where the check runs.

`root` in both scripts is derived from `import.meta.url` (`check-plugin-sync.mjs:22`,
`build-plugin.mjs:6`), i.e. the script's own location — so a worktree invocation
resolves `root` to the worktree top, and a root-derived guard is correct.

### House style precedent

`scripts/release.mjs:41-45` defines `refuse(why, fix)` — prints `release refused: <why>`
then `  fix: <fix>` and exits 1. All scripts here are dependency-free by policy
(release.mjs header, line 20). Match that.

### Rail context

- `scripts/release.mjs:149-161` runs `npm run plugin:check` inside `GATE`, from `root`
  (`run()` defaults `cwd = root`). A root-only guard leaves the release rail untouched.
- There is no `.github/workflows` in this repo — no CI runs these scripts. Verification
  will be a hand-run command log, not a test.
- No test file covers `scripts/`; there is no `scripts/lib/`.
