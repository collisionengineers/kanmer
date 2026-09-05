# Plan (CORE-144)

Two independent guard-fidelity fixes, one PR, in the same worktree/branch.

## F-001 — resolver blind to the two runner scripts

Rather than parse arbitrary `node <script>` bodies, make the two runner
scripts export their own command lists as pure data (`COMMANDS.default` /
`COMMANDS.assumeBuilt`) and have the static resolver in
`scripts/verify-steps.test.mjs` look up a known runner script by its literal
leaf text (`node scripts/run-tests.mjs[ --assume-built]`,
`node scripts/run-http-tests.mjs[ --assume-built]`) and recurse into the
matching mode's command list exactly as if it had been inlined. This keeps
the resolver static-analysis-only (no executing the scripts) and keeps the
runner scripts' actual behaviour byte-identical to before (same commands,
same order), just declared as data instead of inline `run(...)` calls.

Add a second assertion beyond "root build reached exactly once": count every
`(workspace, "build")` pair across the whole resolved rail and assert each is
reached at most once. This is necessary because the regression the review
proved (dropping `--assume-built` from `test:built`) reintroduces a *second*
`@kanmer/mcp-server` workspace build, not a second literal root-level build
invocation — the existing root-only assertion cannot see that class of
duplicate. Prove the fix with a mutation test: build a synthetic copy of the
loaded workspaces map with `test:built`'s script body reverted to
`"node scripts/run-tests.mjs"` (flag dropped) and assert the resolver now
reports two `@kanmer/mcp-server` builds.

## F-002 (+ F-004) — dirty digest blind to untracked-directory mutations

Add `-uall` to `computeDirtyDigest`'s `git status --porcelain=v1 -z` call so
untracked directories are always expanded to individual file entries; a
mutation inside one then changes both the porcelain text and the per-file
hash list. While touching this function, also fix the accepted-risk-but-easy
F-004 note: a rename/copy porcelain entry's second NUL-separated segment (the
"from" path) has no status prefix of its own and must be consumed as part of
the same logical entry, not re-parsed as an independent status+path pair.

Add a temp-repo regression test: create `probe-dir/a.txt`, `writeStamp`, add
`probe-dir/b.txt`, assert `assertBuilt` now refuses.

## Out of scope (per ticket)

No change to which assertions run in the real rail, to `VERIFY_STEPS`
ordering, or to the public `npm test` / `npm run mcpb:check` commands. The
runner scripts' actual build/test behaviour is unchanged — only how it is
declared (as exported data) and, for `run-http-tests.mjs`'s default branch,
the literal command text used to invoke the workspace build (same effect,
now expressible as data the resolver can read).

## Checks

- `node --test scripts/verify-steps.test.mjs`
- `npm run test:scripts`
- `npm run build && node scripts/build-stamp.mjs --write && node scripts/build-stamp.mjs --assert server standalone`
