## Review — CORE-023 / PR #54

**I am both author and reviewer of this ticket. This is not an independent review and should not be read as one.** What it is: a deliberate second pass over my own diff, hunting the one failure mode this feature actually dies of. It found three, and they are fixed in `0838c74` rather than merged and filed.

### Changes (the diff, in the reviewer's words)

Nine files, 1360 insertions / 2 deletions, plus the mandatory 1.4 MB bundle rebuild.

- **`packages/core/src/staleness.ts` (new).** The detector proper. One exported entry point, `detectStaleness({paths, board, boardSource, format, bundledSkillsDir})`, returning `{upToDate, stale[]}`. Five artefact families, each in its own function: the AGENTS.md managed block, the installed skills trees, their stamps, `board.yml`, and the provider MCP registrations. Every filesystem read goes through `readOrNull`/`isDir`/`exists`, none of which can throw; each family is additionally wrapped at the call site. Roughly half the file is comment, and the comments carry the *why* — the false-positive traps and the reason for each state — which is right for a module whose whole risk is judgement rather than mechanism.
- **`packages/core/src/staleness.test.ts` (new), 39 tests.** Notably: 14 of them assert that a row is **absent**.
- **`packages/mcp-server/src/bundled.ts` (new).** Path arithmetic per build shape, split into a pure `skillsDirFor(path, shape)` plus a `statSync` probe. Consumes MCP-012's `serverIdentity()` and derives nothing itself.
- **`packages/mcp-server/src/index.ts` (+23/-2).** The `repo` block and the description paragraph, confined to the `get_status` handler. No other tool touched — MCP-006 is queued behind this on the same file.
- **`packages/mcp-server/src/smoke.mjs` (+78).** 8 checks, of the make-it-stale-and-require-the-verdict-to-change kind.
- **`AGENTS.md` (+7, 0 deletions), `tool-reference.md` (1 line), `ADR-0013` (new).** Prose.

### Comments

1. **BLOCKING — a skill the user chose not to install was reported as missing.** The first pass iterated all 33 bundled files into every destination and counted every absent one as `missing`. A Claude Code user who keeps three of the twelve skills would have been told nine were missing. That is the *same* false positive as counting a user's own skill as drift, arriving from the other direction, and the original design rule ("a user's choices are not drift") had simply not been applied symmetrically. **Fixed in PR:** only a skill folder that is actually installed is judged; a file missing from *inside* one is still reported, because that is a genuinely incomplete copy. The "is this a Kanmer skills directory at all" test now falls out of the same computed set rather than being a separate `installed === 0` counter — which also fixed a latent bug the first pass had introduced, where a stranger's `.agents/skills` would still have drawn an `unstamped` row.

2. **BLOCKING — registration checking could attribute another server's `--root` to Kanmer.** The first pass guarded with `text.includes("kanmer")` and then took the first `"--root"` in the file. In a repo that merely *lives* in a folder called `kanmer` — which is to say, in this repo — that guard is true of every config file, and any other MCP server's `--root` would have been read as Kanmer's and reported `behind`. A real false positive on the real repo, caught only because I went looking for it. **Fixed in PR:** Kanmer's own entry is read. JSON hosts are parsed properly (`mcpServers.kanmer.args`, plus opencode's `mcp.kanmer.command`, where the whole argv is the `command` array — a shape the first pass would have missed entirely); the two TOML hosts are read by slicing the `[mcp_servers.kanmer]` table out to the next top-level `[` before scanning. Still no TOML dependency in core, which was the point of the text scan in the first place. Three tests added, including the misattribution case and a later-TOML-table case.

3. **NON-BLOCKING but fixed — the skills `fix` string pointed at a button that cannot work.** It said "Update skills in the Kanmer app". Research finding 3 of this very ticket establishes that the button compares `plugin.json`'s frozen `0.1.0` against the installed stamp and therefore has never lit up for any release ever shipped. Telling a user to click it is advice that does nothing. Now says reconnect, which does copy.

4. **NON-BLOCKING, accepted as-is — `staleness.ts` mirrors two small lists from `providers.ts`** (skill destinations, registration file paths). Core cannot import the Electron main process, so one of the two has to hold the copy. Commented as such at both list definitions and recorded in ADR-0013's consequences. Disposition: **filed** — the GUI follow-up inverts it so `providers.ts` reads from core.

5. **NON-BLOCKING, won't-do — no `reconciledWith` in `version.json`.** Q8. A field with no writer is permanently absent and must report `unknown` on every repo forever; a row that always fires means nothing. Belongs with its writer under FRD-013. Recorded in `open-questions` and in ADR-0013's alternative (a).

6. **NON-BLOCKING, won't-do — the ~2000-line-per-call cost is not cached.** Deliberate, and argued in the code: the obvious next action after reading this report is `kanmer-setup`, and a cached "stale" verdict surviving its own repair is worse than 36–52 ms. The smoke test pins the property (repair the sandbox, call again, clean in the same process).

### Check: report against diff

`post-implementation-report.md` lists all nine source files with honest rationales, and the diff matches. Two things the report claims that I verified independently rather than took on trust:

- **"`git diff AGENTS.md` shows the managed block untouched."** Confirmed: 7 insertions, **0 deletions**, all inside §7. Given that this ticket exists because Connect corrupted that very block, a silent managed-block edit in this PR would have been the worst possible outcome. It is clean.
- **"Nothing hardcodes the block text."** Confirmed by the test `does not hardcode the current body — the reference comes from the bundle`, which moves the *bundle's* canonical body and requires a previously-clean repo to flip to `behind`. That is the property SKILL-013 depends on, and it is mechanically enforced rather than asserted in prose.

### Check: governing docs

- **FRD-013 (linked ref) — met, unmodified.** R1(b) ("apply any Kanmer-version upgrade steps") rested on a "last reconciled against" value nothing ever recorded; the detector supplies the comparison by content instead. Every `fix` string routes to `kanmer-setup`, so this is the detection half and FRD-013 keeps the repair half. AC4 verified live: `verify-agents-block` 26/26.
- **ADR-0008 (linked ref) — met, unmodified.** The dead-key row is ADR-0008's own contract observed. I checked the format guard specifically, because getting it backwards would scold every format-2 board for being format 2: a test pins `format: 2` → no `behind` row.
- **FRD-022 R5b — conventions inherited, unmodified.** Absence-is-the-signal, degrade-don't-throw, determinism. Verified the determinism claim mechanically rather than by reading: `plugin:check` was run in a **clean clone** (it refuses in a linked worktree by design) and reported `bundle bytes match`. Zero build-time inputs were added, so R6's byte comparison and R5c's release rebuild are untouched.
- **ADR-0013 — new, written, and the plan said it would be.** Carries the enumeration table, which is the ticket's third acceptance criterion ("written down, not implied"). Its alternative (b) records *why* the operator-authorised build-time bake was not used — the honest place for a deviation from an authorisation. **Not yet in `refs`**: `link_doc` validates against the main checkout and the file exists only on the branch. Added at verify.

### Check: the code and the ripple effects

- `files`' ripple list worked through: the bundle **was** rebuilt and byte-verified; `verify-agents-block` still passes; `tool-reference.md` and AGENTS.md §7 updated; `release.mjs` untouched, correctly, since no build-time input was added.
- Deliberately out-of-scope items stayed out: nothing repairs anything, `agentsBlock.ts` is untouched (SKILL-013's), the binary is untouched (MCP-012's), retired skills are reported but not removed (GUI-080's), and no GUI surface exists (operator's Q3).
- The four-state vocabulary is pinned by a test that walks every emitted row and rejects anything outside it, plus empty `detail`/`fix`.
- Real-repo behaviour re-measured after the fixes: identical rows, 52 ms.

### Verdict

**PASS.** Checked: the report against the diff, all four governing docs, the false-positive surface (which is where the risk lives and where all three blocking findings came from), the ripple list in `files`, and the full rail. Three blocking points found and fixed in-PR rather than filed, since all three were narrowings of behaviour with tests, not new scope.

Rail, final state: core 232/232 (39 staleness), GUI 236/236, scripts 41/41, typecheck green across four workspaces, `plugin:check` OK in a clean clone with bundle bytes matching, smoke 142/142, smoke:protocol 26/26, smoke:discovery 13/13, verify:agents-block 26/26. GUI-085 flaked on the first full run and passed 7/7 alone and 21/21 on the re-run — pre-existing, untouched.

Merging under the standing delegation.
