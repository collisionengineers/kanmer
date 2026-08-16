# Proof — CORE-023

Verified on merged `main` at **`3e9ee2c`** ("Detect when a repo's Kanmer is older
than the agent's (CORE-023) (#54)"), from the **main checkout**
`C:\Users\PC\Documents\GitHub\kanmer`, after `git pull --ff-only`,
`npm install`, `npm run build`. Working tree clean apart from two untracked
PNGs that predate this ticket. `AGENTS.md` is unmodified.

## 1. The three acceptance criteria

### AC1 — reports staleness against a repo set up on an older Kanmer, naming which artefacts are behind

The real `get_status` tool, called over real stdio by an MCP client against this
repo (`--root .worktrees/kanmer --repo-root <repo>`):

```
server: {"version":"0.3.2","path":"…\packages\mcp-server\dist\index.js",
         "sha256":"512c2dd5ba168b7837781dc578f24fc95b7f7efe8c9bbd1fdd62d5f17c5a14f5",
         "sha256Short":"512c2dd5","mtime":"2026-08-16T23:55:31.616Z",
         "size":50848,"build":"dev-esm"}
repoRoot: C:\Users\PC\Documents\GitHub\kanmer | format: 3
repo: {
  "upToDate": false,
  "stale": [
    { "artefact": "skills", "state": "behind",
      "detail": ".claude/skills: 3 file(s) differ from the bundled skills and 0 are missing — affected skills: kanmer-report, kanmer-setup, kanmer-tickets.",
      "fix": "run kanmer-setup (it reconciles; FRD-013), or reconnect this project in the Kanmer app" },
    { "artefact": "skills-stamp", "state": "unstamped",
      "detail": ".claude/skills has no .kanmer-skills-version, so nothing records which Kanmer wrote it or which skills it owns there.",
      "fix": "reconnect in the Kanmer app to write the stamp" },
    { "artefact": "skills", "state": "behind",
      "detail": ".agents/skills: 17 file(s) differ from the bundled skills and 0 are missing — affected skills: kanmer-auto, kanmer-closeout, kanmer-docs, kanmer-execute and 8 more.",
      "fix": "run kanmer-setup (it reconciles; FRD-013), or reconnect this project in the Kanmer app" },
    { "artefact": "board-config", "state": "compensated",
      "detail": "board.yml's profiles omit questions-resolved; core injects it at read time, so the gate is in force and the file simply no longer lists every effective requirement.",
      "fix": "none — informational" }
  ]
}
```

Named, itemised, and each with a fix. This is a repo that has been silently
carrying drifted skills, and nothing said so before today.

### AC1b — the motivating regression, reproduced and caught end-to-end

The ticket's motivating case is not hypothetical: during this ticket's run,
Connect overwrote this repo's `AGENTS.md` with the stale **v2** block, and the
diff was saved as evidence (`scratch-live-reproduction`). That patch was applied
to a throwaway copy of the current `AGENTS.md` in a temp directory, and the real
`get_status` tool pointed at it with `--repo-root`:

```
repoRoot: …\scratchpad\v2repro
upToDate: false
[
  { "artefact": "agents-block", "state": "behind",
    "detail": "The AGENTS.md managed block differs from the one this Kanmer ships — the instructions agents read in this repo are not this version's.",
    "fix": "run kanmer-setup (it reconciles; FRD-013), or node scripts/agents-block.mjs <repo>" },
  { "artefact": "board-config", "state": "compensated", … }
]
```

The exact real-world corruption this ticket exists for — seven stages,
`impact.md`, the deleted `-import` skill — is detected by the shipped tool. The
temp copy was deleted afterwards and the repo's own `AGENTS.md` was never
touched (`git status --short AGENTS.md` empty throughout).

### AC2 — a current repo reports clean; no false positives from a user's own edits

Three independent demonstrations:

- **The real repo, above.** The user's own `run-kanmer` skill lives in
  `.claude/skills` with a 115-file `node_modules` under it and produces **no
  row** — the bundled-tree-first walk never reads it. This repo's `.mcp.json`
  is correctly rooted at `.worktrees/kanmer` and produces **no row**. And
  `board.yml`'s missing `questions-resolved` — which **every board in existence**
  has, because `resolveProfiles()` injects it at read time — is `compensated`
  with `fix: "none — informational"`, not a warning.
- **The smoke test, on a fresh sandbox:** `a repo with nothing installed is not
  reported as behind — ["agents-block:unstamped"]`, i.e. `upToDate: true`.
- **14 of the 39 unit tests assert that a row is ABSENT**, including: a skill
  the user wrote, a skill the user chose not to install, a skills directory
  holding none of Kanmer's skills, a correctly-rooted registration, another
  server's `--root` in the same file, a registration with no `--root` at all,
  an unparseable config, dead keys on a not-yet-migrated board, and CRLF vs LF.

### AC3 — the not-covered-by-migration list is written down, not implied

`docs/architecture/adr/ADR-0013-staleness-by-content-not-version.md`, on main,
now in the ticket's `refs`. Its Context section is an eight-row table of every
version-sensitive artefact a repo carries, each marked migrated? / reconciled by
setup? / detector-before-this-ADR. Rows 2–6 and 8 are this ticket, row 1 is the
format banner, row 7 is MCP-012.

## 2. The rail, on merged main

| Command | Result |
|---|---|
| `npm test` — core | **10/10 files, 232/232 tests** (39 of them `staleness.test.ts`) |
| `npm test` — gui | **23/23 files, 256/256 tests** |
| `npm test` — scripts | **41 pass, 0 fail** |
| `npm run typecheck` | green across all four workspaces (`@kanmer/core`, `@kanmer/mcp-server`, `@kanmer/ui`, `@kanmer/gui`) |
| `npm run plugin:check` | `plugin-sync OK — 29 tools match, bundle bytes match, 12 skill frontmatters parse, manifests at v0.3.2` |
| `node packages/mcp-server/src/smoke.mjs` | **142/142 checks passed** (was 133; +9) |
| `npm run smoke:protocol` | **26/26 checks passed** |
| `npm run smoke:discovery` | **13/13 checks passed** |
| `npm run verify:agents-block` | **26/26 checks passed** |

`plugin:check` reporting **`bundle bytes match`** is the load-bearing one: it is
the byte-for-byte comparison of the committed bundle against a fresh build, and
it confirms the design claim that this change added **no build-time input**.
(GUI-085's `kanmerGit.test.ts` flaked once during pre-merge work under load and
passed 7/7 alone; on merged main the full GUI suite passed 23/23 outright.)

## 3. The new smoke checks, verbatim

These are the executable end-to-end evidence — mcp-server has no vitest suite —
and they are written to the standard MCP-012's identity block was held to: they
make the sandbox stale on purpose and require the *verdict* to change, rather
than asserting a field exists.

```
PASS  get_status carries a repo staleness block
PASS  a repo with nothing installed is not reported as behind  — ["agents-block:unstamped"]
PASS  an absent AGENTS.md is unstamped, not behind
PASS  every staleness entry is itemised: artefact, state, detail and fix
PASS  a stale AGENTS.md managed block is reported as behind
PASS  one behind entry clears repo.upToDate  — false
PASS  the behind entry names a fix rather than applying one
PASS  get_status did not rewrite the stale block it reported
PASS  the verdict is recomputed, not cached, so a repair is seen immediately
```

The last two are the design commitments made executable: `get_status` is
`readOnlyHint` and did not repair the block it complained about, and removing the
damage produced a clean verdict **in the same process**, proving nothing is
cached.

## 4. Design claims verified rather than asserted

- **Nothing hardcodes the AGENTS block text**, so [[SKILL-013]] can rewrite the
  canonical body freely. Pinned by the test *"does not hardcode the current body
  — the reference comes from the bundle"*: it moves the **bundle's** canonical
  body and requires a previously-clean repo to flip to `behind`.
- **Detection reads `repoRoot`, not `projectRoot`.** Demonstrated by AC1b, where
  changing only `--repo-root` moved the verdict while the board root stayed put.
  In AC1 the board is at `.worktrees/kanmer` and the artefacts were still found.
- **Absence is the contract.** The `repo` block is new in 0.3.4; the MCP session
  this ticket was worked from is still served by the installed 0.3.2 binary and
  its `get_status` returns no `repo` key at all — the documented signal, observed
  live, not an error.
- **Cost:** 36–52 ms on this repo, recomputed per call.

## 5. Scope honoured

No GUI surface (operator's Q3 — filed as a follow-up at closeout). Nothing
repaired. `apps/gui/src/main/agentsBlock.ts` untouched (SKILL-013's).
`scripts/agents-block.mjs` untouched (`verify:agents-block` 26/26 confirms).
The binary untouched (MCP-012's). Retired skills reported, not removed
(GUI-080's). No `reconciledWith` field added (Q8). `AGENTS.md`'s managed block
untouched — 7 insertions in §7, 0 deletions, verified before every commit.
