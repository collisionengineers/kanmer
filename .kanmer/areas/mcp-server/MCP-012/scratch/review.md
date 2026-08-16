## Review — PR #46, MCP-012

**I am both author and reviewer of this change. This is a self-review and should
not be read as an independent one.** What follows is what I actually re-checked
against the diff, including two things I changed as a result.

### Changes (reviewer's reading of the diff)

- **`packages/mcp-server/src/identity.ts` (new, 164 lines).** `serverIdentity()`
  returns version / path / sha256 / sha256Short / mtime / size / build. Two
  independent `try` blocks so a stat failure does not cost the hash or vice
  versa; both swallow to `null`. Memoised in a module-level `cached`.
  `classifyBuild` splits on `[\\/]` and matches the last three **segments**, not
  substrings — a checkout that happens to sit under a folder named `resources`
  is not misreported as packaged. `packaged` requires grandparent `resources`;
  any other `…/mcp/kanmer-mcp.cjs` falls to `plugin`, which is right for plugin
  roots this repo does not control.
- **`version-define.mjs` (new).** Reads the root `package.json` relative to its
  own `import.meta.url` and returns `{ __KANMER_VERSION__: JSON.stringify(v) }`.
  Throws if the version is missing — correct: a silently absent stamp is the
  failure mode this ticket exists to end.
- **`tsup.config.ts`** gains `define` + `shims: true`; **`tsup.standalone.config.ts`**
  gains `define` only. The asymmetry is load-bearing and commented at both ends.
- **`index.ts`.** `repoRootSource` computed in `resolveRoot()`; `get_status`
  gains `repoRoot`, `repoRootSource`, `server`; `McpServer` version now injected;
  description rewritten; stderr ready-line carries the identity.
- **`smoke.mjs`** +13 checks. **`scripts/release.mjs`** three prose/ordering
  edits plus step 5b. Docs: `tool-reference.md`, `AGENTS.md` §5, FRD-022.
- **`plugins/kanmer/mcp/kanmer-mcp.cjs`** regenerated.

### Comments

1. **[blocking] `resetIdentityCache()` was exported and used by nothing.**
   `noUnusedLocals` does not catch unused *exports*, and `packages/mcp-server`
   has no vitest suite, so the "test seam" comment described a test that does
   not and will not exist. Dead code justified by a hypothetical.
   → **Fixed in PR** (removed). Bundle bytes unchanged — esbuild had already
   tree-shaken it, which rather makes the point.
2. **[blocking] FRD-022 requirement ordering.** R5b/R5c were inserted *before*
   the existing R5a, giving R5 → R5b → R5c → R5a. In a numbered contract
   document that reads as an editing accident.
   → **Fixed in PR** (R5 → R5a → R5b → R5c).
3. **[non-blocking] The assertion that actually matters is the in-test hash.**
   Checked deliberately: `smoke.mjs` recomputes sha256 of the spawned file and
   compares. A server that returned a hard-coded constant would fail. An earlier
   `typeof === "string"` version would not have. Kept.
4. **[non-blocking] `repoRootSource` is scope the ticket did not literally ask
   for.** It is one line, it is symmetric with `rootSource`, and it names the
   exact measured divergence (`--repo-root` present vs absent). Recorded as a
   planning-time default in `open-questions`, not smuggled in.
   → **Won't-do-otherwise**: keeping it. Called out here so a later reader sees
   it was a decision.
5. **[non-blocking] Placement of `repoRoot` at top level rather than inside
   `server{}`**, against a literal reading of the brief's "same identity block".
   Rationale in the plan: it is a *root*, not a property of the binary, and
   `rootSource` is fixed top-level by MCP-010 — splitting the two roots across
   two nesting levels would be worse. → **Flagged, not changed.** Easy to move
   if the operator disagrees; it is a key position, not a semantic.
6. **[non-blocking] Pre-existing GUI flake** (`kanmerGit.test.ts >
   ensureBoardWorktree reconciliation`, 5s timeout + EPERM under load). Verified
   not mine: `git diff origin/main HEAD -- apps/gui packages/core` is empty.
   Green on the final run (217/217). → **Won't-do here**; deserves its own
   ticket to raise that timeout.
7. **[resolved] GUI-066 landed mid-flight and did conflict**, exactly as
   predicted. See below.

### The GUI-066 collision, resolved

`0c4ffda` (GUI-066, PR #45) merged while this was in review and touches both
`scripts/release.mjs` and `AGENTS.md`. `AGENTS.md` auto-merged. `release.mjs`
conflicted in **one** hunk: the `--dry-run` printout, which we had both
renumbered. Resolution keeps **both** — GUI-066's richer steps (verify every
published asset byte-for-byte; repair-once-then-refuse) *and* MCP-012's rebuild
step — renumbered to nine. My other two hunks (the clean-tree refusal text at
`:169`, the `GATE` comment at `:212`) rebased cleanly and were confirmed present
by grep afterwards, not assumed. `node --check` on the result, and the whole rail
re-run.

### Checks performed

- **Report against diff.** Every file in the post-implementation report's table
  appears in the diff and vice versa; the `release.mjs` section names the three
  edits by line and they are the three that exist. Honest.
- **Governing docs.** FRD-022 is the only `ref`. R5/R6 met; R5b/R5c added, which
  is a *modification* of a governing doc — **explicitly authorised by the
  operator** for the release-rail half (`scratch/operator-answers.md`) and
  recorded there, not assumed. No new ADR: ADR-0012 already owns the
  `RootSource` vocabulary and this imports the type rather than re-declaring it,
  so it cannot drift — including the seventh value `init`, which
  `smoke:discovery` exercises end-to-end.
- **Ripple effects from `files`.** All followed: bundle rebuilt and committed;
  release rail changed; `smoke.mjs` extended and `smoke-protocol.mjs` verified
  still green *untouched*; the documentation triple updated. `packages/core`
  untouched, as scoped. `FRD-022:48-49`'s smoke count left alone as instructed.
- **The claim itself.** Re-ran the before/after pair rather than trusting the
  transcript. Old build omits the block; new build reports `97f6ca41`,
  `build: plugin`, `repoRootSource: derived`. Real `npm run dist` →
  `build: "packaged"` through the packaged `Kanmer.exe`. Determinism: three
  builds identical; a version bump changes the bytes and fails `plugin:check`,
  which is the empirical case for step 5b rather than an argument for it.
- **Rail after the final rebase:** core 193/193 · gui 217/217 · typecheck clean ·
  plugin:check OK (29 tools, bytes match, 12 frontmatters) · smoke:protocol 26/26 ·
  smoke:discovery 13/13 · smoke.mjs 133/133. Committed bundle confirmed
  byte-identical to a fresh build at HEAD.

### Verdict

**PASS** — with the caveat in the first line that this is not an independent
review. Two blocking points were found and fixed in the PR before merge; the
rest are recorded above with their disposition. Merging under standing
delegation.

**[[CORE-023]] is queued behind this on the same `get_status` handler** and must
rebase onto this before it edits that block.
