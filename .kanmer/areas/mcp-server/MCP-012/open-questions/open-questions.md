# Open questions — MCP-012

Both operator-only questions are **answered**. Neither is re-opened by planning.

## Answered

- [x] **OPERATOR — May `scripts/release.mjs` be changed so the release commit
      contains a rebuilt MCP bundle, not just the version bump?**
      **ANSWERED: YES** — operator, 2026-08-16, recorded verbatim in
      `scratch/operator-answers.md`. The rebuild-in-the-release-commit option
      was selected: insert `npm run build && node scripts/build-plugin.mjs`
      after the version bump and before the pack, so the release commit carries
      the regenerated bundle. This authorises a **build-time version stamp**, so
      `get_status` reports a real release number and not only a hash.
      Two existing rules are deliberately widened and **both must be updated in
      prose, not silently**: the comment at `release.mjs:151-152` ("NOT
      `plugin:build` — that rewrites the committed bundle…") is to be *rewritten*
      to explain why the order is now bump → rebuild → commit, **not deleted**;
      and the rule at `release.mjs:115` that a release commit contains only the
      version bump now reads: the bump **and the artifacts derived from it**.
      Unchanged by the answer: the stamp must remain a **pure function of the
      source tree** — no build timestamp, no embedded git sha — because
      `check-plugin-sync.mjs:57-76` compares the committed bundle byte-for-byte
      with a fresh build. The runtime self-sha256 stays as the identity that
      needs no build cooperation. `repoRoot` is also to be reported.
      `scripts/release.mjs` is the ticket's HIGH-risk file, not the `get_status`
      diff.

- [x] **OPERATOR/ORCHESTRATOR — Does MCP-012 wait for MCP-010, or ship
      independently?**
      **ANSWERED: MCP-012 WAITS** — scheduler, 2026-08-16, recorded in
      `scratch/scheduling.md`. Lane A is **MCP-010 → MCP-012 → CORE-023 →
      MCP-007 → MCP-009**, serial, because all three edit the same
      `get_status` handler in `index.ts`. MCP-010 has since **merged** as
      `741ef81` (PR #40), so the fallback ("report only what today's resolver
      knows") is moot: MCP-012 plans against the resolver that actually shipped.
      That resolver returns `{ root, how, tried }` and `get_status` already
      surfaces `how` as `rootSource` — **MCP-012 consumes that field and does
      not rename it.**
      One correction to the note as written: the `RootSource` vocabulary is
      **seven** values, not the six settled at the time —
      `flag | env | cwd | cwd-worktree | ancestor | ancestor-worktree | init`.
      `init` was added deliberately by MCP-010 (the operator's `--init` answer
      post-dated the vocabulary ruling, and reporting `cwd` when nothing was
      found would have been false). Read
      `packages/core/src/discover.ts:14-22` on merged main, not the six-value
      list. MCP-012 reports the imported type as-is and so cannot drift from it.

## Parked (explicitly deferred)

- [x] Should `get_status` *judge* the build (warn "your server is stale") rather
      than just report it? **Deferred:** judging needs a known-good reference to
      compare against, which is CORE-023's job. Reopen if CORE-023 lands a
      version oracle this could consume.
- [x] Should `packages/mcp-server/package.json` (`0.1.0`) and
      `plugins/kanmer/.claude-plugin/plugin.json` (`0.1.0`) be realigned with the
      released version? **Deferred:** neither is read at runtime by the shipped
      bundle, and the version reaches the server by build-time `define` from the
      root `package.json`, so neither becomes a source of truth. Nothing is
      wrong today; it stays a separate chore.
- [x] Should the GUI show the identity of each running server (Sessions /
      Connect panels)? **Deferred:** the agent-facing gap is the one that caused
      the incident. Reopen once `get_status` carries the data and a human wants
      it without an agent.

## Decided during research (recorded, not asked)

- **Which version.** The root / `apps/gui` `package.json` version (`0.3.2`) —
  the only one `release.mjs` bumps.
- **The stamp must be deterministic in the bundle.** No build timestamp and no
  git sha. Non-deterministic facts (mtime, self-hash) are observed at runtime.
- **Identity = injected version + runtime self-sha256 of the running script +
  resolved path + mtime + size.**
- **Build shape from the resolved path** (`packaged` / `plugin` /
  `dev-standalone` / `dev-esm`), per `apps/gui/src/main/connect.ts:36-52`.
- **Cost.** Hash lazily, cache for the process lifetime.
- **Failure mode.** Any stat/hash/path failure yields `null` fields, never an
  `isError` result.
- **`repoRoot` is included.**
- **Detection is one-sided and that is fine.** Absence of the block signals a
  pre-0.3.3 build; this goes in the tool description.
- **Proving "survives packaging".** `npm run dist` → `win-unpacked`, driven by
  `smoke.mjs` with `KANMER_NODE`/`KANMER_SERVER`.

## Decided during planning (trivial defaults, taken not asked)

- **`repoRootSource`** (`flag` | `env` | `derived`) is reported alongside
  `repoRoot`. The measured divergence *is* that codex passes `--repo-root` and
  `.mcp.json` does not, so naming how the repo root was reached is the same
  fact `rootSource` already gives for the board root. One line, no new inputs.
- **`repoRoot` sits top-level beside `projectRoot`/`rootSource`**, not inside
  `server{}`: it is a root, not a property of the binary, and `rootSource` is
  fixed top-level by MCP-010. The contiguous head `projectRoot / repoRoot /
  rootSource / repoRootSource / server{}` is the identity block.
- **No module-`format` field.** `get_status.format` already means the *store*
  format; a second `format` would be actively confusing. Module format is
  implied by `build`.
- **`shims: true` on `tsup.config.ts` only.** The CJS standalone has
  `__filename` natively, so the byte-compared config gains only the `define`.
