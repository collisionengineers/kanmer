# Proof — GUI-073

Verified on **merged `main`** at `d1ef063` ("Stop labelling Antigravity
"register-only" — it has project-level support (GUI-073) (#55)"), from the main
checkout, 2026-08-17. PR #55, squash-merged.

## Rail

```
$ npm run typecheck
@kanmer/core       tsc --noEmit      clean
@kanmer/mcp-server tsc --noEmit      clean
@kanmer/ui         tsc --noEmit      clean
@kanmer/gui        tsc --noEmit -p tsconfig.node.json && -p tsconfig.web.json   clean

$ npm test
manual: up to date (19 chapters)
@kanmer/core  Test Files  10 passed (10)   Tests  232 passed (232)
@kanmer/gui   Test Files  23 passed (23)   Tests  257 passed (257)
test:scripts  ✔ v0.3.2 PASSES: all three assets present, uploaded, digests match
              ✔ v0.3.1 PASSES (complete after its manual re-publish)
              ✔ v0.3.0 FAILS on exactly one thing: the absent blockmap

$ npm run check:manual
manual: up to date (19 chapters)
```

**257/257 on the GUI suite, no flake this run.** ([[GUI-085]]'s
`kanmerGit.test.ts` timeout appeared once during branch work under parallel load
and passed 7/7 when rerun alone at `--testTimeout=30000`; it did not recur on
main.)

## The three verification items from the ticket

### 1. "Antigravity's row no longer implies reduced project support"

```
$ grep -n "no background dispatch" apps/gui/src/renderer/src/components/Settings.tsx
404:                  · no background dispatch
```

The badge string is the only one the row renders, and the panel blurb above it no
longer claims opencode and Antigravity "only read skills globally".

```
$ grep -rn "register-only" apps docs plugins packages scripts   # source only
apps/gui/src/main/providers.ts:79           comment explaining what the badge used to say
apps/gui/src/main/providers.test.ts:135     same, in the replaced test's comment
apps/gui/src/main/providers.test.ts:166     assertion that the note never says it
apps/gui/src/renderer/src/components/Settings.tsx:394   same, in the badge's comment
apps/gui/src/renderer/src/manual/chapters.generated.ts:28  the manual's "the badge used to read…"
docs/manual/connect.md:43                   the same sentence, in source
docs/plans/kanmer-v2/phase-6-agents-connect/plan.md:19    historical planning record
docs/plans/kanmer-v2/phase-7-agents-dispatch/plan.md:11   historical planning record
```

No live UI string. Every remaining hit either *quotes* the old label to explain
it, asserts against it, or is a v2-era planning document that records what was
believed at the time (falsifying those would be worse than leaving them).

Three further hits are **stale build outputs**, not source — confirmed untracked
and gitignored, and replaced by the next build:
`apps/gui/out/main/index.js`, `packages/ui/dist/index.js`,
`apps/gui/release/win-unpacked/resources/app.asar`.

### 2. "The label names the actual limitation, and matches the dispatch menu"

Both the badge and the menu read the same field. Asserted on main:

```
$ npx vitest run src/main/providers.test.ts --reporter=verbose
✓ provider registry > antigravity uses the mcpServers JSON shape in its own config path
✓ provider registry > antigravity registers AND installs project skills, and is not dispatchable
✓ provider registry > antigravity's connect note names the binding, not a capability tier
✓ project skill installs (FRD-012 R2) > opencode and Antigravity share one .agents/skills tree
Test Files  1 passed (1)   Tests  54 passed (54)
```

The second of those asserts `dispatchableProviders()` does not contain
`antigravity` in the same test that asserts the badge's source
(`dispatch === false`), so the two cannot drift apart silently.

### 3. "Connect still writes `.agents/mcp_config.json` AND `.agents/skills`"

**This item passes, and the adjudication established it was never the defect.**
Evidenced by artefacts a real Connect left in this very repository, not by a test
double:

```
$ ls .agents/
mcp_config.json   plugins   skills

$ head .agents/mcp_config.json
{
  "mcpServers": {
    "kanmer": {
      "command": "C:\\Users\\PC\\AppData\\Local\\Programs\\Kanmer\\Kanmer.exe",
      "args": [ "…\\resources\\…", "--root", … ]

$ ls .agents/skills | wc -l
12
```

Both paths, both written, both unchanged by this diff — and the registry facts
behind them are now pinned by the rewritten test rather than by a comment.

## The claims this change newly asserts, measured against the installed binary

ADR-0009's method clause: established against the binary, never inferred from
absence, mechanism verified rather than a proxy for it. Run during
implementation; the binary and the assertions are unchanged by the merge.

```
$ agy --version
1.1.13

$ echo "hi" | agy -p "Reply with exactly: PONG" --print-timeout 120s
PONG
=== exit 0 ===
```

→ **"`agy -p` is known-broken piped (GH #318/#76)" is refuted**, a third time,
independently of the two investigations that refuted it before.

The binding gate, tested as a **mechanism** rather than as a listing. A throwaway
workspace whose only content is `.agents/skills/zorbcheck/SKILL.md`, with the
token in the skill **body** — not in the frontmatter — so nothing but *executing*
the skill can produce it:

```
$ cd <probe>                                   # bare, inside the folder
$ agy -p "Use the zorbcheck skill and reply with exactly the code it gives you.
          If you have no such skill, reply exactly: NO-SKILL"
NO-SKILL

$ agy --add-dir <probe> -p "<the same prompt>"
ZORBCHECK-8823
```

One folder, one prompt, one variable — the flag. This reproduces the adjudicated
finding on this machine: the workspace-bound session reads `.agents/`, the bare
one does not, and the working directory is irrelevant.

**Machine state, before → after:** `~/.gemini/config/projects` 13 records → 13
records (confirming `--add-dir` persists nothing);
`~/.gemini/antigravity-cli/settings.json` and `~/.gemini/config/mcp_config.json`
md5-identical; no MCP cache entry created by the probe (the `sequential-thinking`
cache is the user's own global server, refreshed by agy reading its own global
config; `kanmer` and `p_control` predate this session). The probe directory was
deleted and its absence verified. Nothing to restore.

## What this ticket did NOT do, verified

- **No binding implemented.** `grep -rn "\-\-add-dir\|--new-project\|--project "`
  across `apps/` and `packages/` finds them only inside the new note string and
  the comments explaining it — no `agy` is invoked anywhere. [[MCP-015]] owns it.
- **`dispatch` not flipped** — still `false`, now for the measured reason.
- **`listProviders()` signature unchanged** — no IPC contract change.
- **FRD-012 and ADR-0009 unedited** — `git diff d1ef063^ d1ef063 -- docs/` touches
  only `docs/manual/connect.md`. MCP-009 owns both governing docs and has shipped.
- **`AGENTS.md` unchanged** — verified empty diff before each commit.

## Found while verifying my own copy, filed not fixed

**[[GUI-088]]** — `installSkills` returns at the `kind: "marketplace"` branch
before `ensureAgentsBlock(root)`, so Claude Code and codex never receive the
AGENTS.md managed block, while FRD-012 R3 requires it "for every provider". Found
because a draft of the new blurb took that claim from R3 and it was checked
against the code before shipping. The blurb was corrected; the divergence is on
the board.
