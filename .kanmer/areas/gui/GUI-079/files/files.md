# Files — GUI-079

## What the investigation established

Five facts the plan should be built on, each verified read-only on 2026-08-16.

**F1 — the sweep must not round-trip the global TOML.** `providers.ts` already
depends on `smol-toml`, and the obvious implementation (parse → delete the
`kanmer-*` keys → stringify) is *destructive on the real file*. Feeding the live
`~/.codex/config.toml` through `TOML.parse`/`TOML.stringify` produced a
different file (9704 → 10092 bytes) with two semantic-grade changes:
`startup_timeout_sec = 120.0` collapsed to `120` (float → integer, on a field
codex reads as f64), and every single-quoted literal string — including all 65
`[projects.'c:\…']` trust headers — was rewritten as a double-quoted escaped
string. Comments would be dropped too. The existing `codexTomlMerge`/`Unmerge`
are safe because they only ever touch a small, Kanmer-written *project* file;
the global file is a different animal.
→ **Parse for listing; do not stringify for writing.** Removal should go through
`codex mcp remove <name>` (one call per entry — the very command the provider
already runs, just enumerated) or a surgical table-block excision.

**F2 — the project root is recoverable, the name is not.** The legacy entry's
`args` carry `--root <boardRoot>` and, when the board lives elsewhere,
`--repo-root <sourceRoot>` (confirmed in `pegasus/.codex/config.toml`).
`codexServerName` is lossy — it lowercases, slugifies and truncates a basename to
32 chars, and basenames are not unique across a machine. The sweep must key its
"does this project have a replacement?" probe on `--repo-root ?? --root`, never
on the name.

**F3 — the pegasus case is already gone from this machine.** `~/.codex/config.toml`
now holds only `openaiDeveloperDocs` and `node_repl`; `pegasus/.codex/config.toml`
now holds a proper `[mcp_servers.kanmer]`. The "no project-scoped replacement"
fixture must be **synthetic**. There is no live reproduction left, so the
verification bullet in the ticket has to be met by a hand-written fixture.

**F4 — the `.mcp.json` collision is bidirectional and already extends past
disconnect.** Claude's project registration in this very repo is
`mcpServers.kanmer` with `"type": "stdio"`; grok's `mcpServersMerge` writes the
same key with no `type`. Beyond the deletion defect the ticket names, there is a
second, quieter consequence: `isRegistered()` in `connect.ts:117` reads
`mcpServers.kanmer` out of `.mcp.json` to decide whether **grok** is connected.
A Claude-only project therefore reports grok as registered, so
`hasRegisteredCopySkillsPeer` keeps the AGENTS.md block alive for a host that was
never connected. Whatever ownership rule is chosen must be applied to
`isRegistered` as well as to `unmerge`, or the fix is half a fix.

**F5 — codex exposes what the sweep needs.** `codex mcp list --json` returns
`{ name, enabled, transport: { command, args, env, cwd }, … }` and
`codex mcp remove <NAME>` takes a bare name. Both verified against the installed
CLI. The formatting of the live config survived whatever removed the pegasus
entry, which is suggestive (not conclusive) evidence that codex's own writer is
surgical.

## Files this change touches

| Path | What changes | Risk |
| --- | --- | --- |
| `apps/gui/src/main/providers.ts` | Add the **pure sweep core**: parse a global TOML string → list every `mcp_servers.kanmer-*` entry with its recovered project root (F2); classify each as *drainable* (project has a replacement) or *sole registration* (it does not). Add the ownership predicate for the `mcpServers.kanmer` shape (F4) and wire grok's `unmerge` to it. `codexServerName` stays as-is. | **High.** The sweep core is the whole ticket. Its inputs are adversarial: unparseable files, `url`-only entries with no `args`, entries with no `--root` at all, duplicate basenames. Every one of those must degrade to "report, do not remove". |
| `apps/gui/src/main/connect.ts` | New exported sweep orchestration: read `~/.codex/config.toml`, call the pure core, probe each listed project's `<root>/.codex/config.toml` for `[mcp_servers.kanmer]`, return the classified list; a second entry point applies the removals via `codex mcp remove`. `disconnectAgent` (line 287) stops calling `unmerge` unconditionally for `.mcp.json`. `isRegistered` (line 117) gains the same ownership test (F4). | **High.** Reads and mutates config outside the project — the one thing the Connect UI's own hint text promises it does not do ("so nothing is written outside this project", `Settings.tsx`). That promise now needs restating. Removal must be best-effort per entry: one failing `codex mcp remove` must not abort the rest. |
| `apps/gui/src/main/index.ts` (~line 615-626) | Register the new IPC handler(s) next to `connectAgent`/`disconnectAgent`/`listProviders`. The sweep is machine-scoped, not project-scoped, so it fits the `listProviders` pattern (no `projectId`) rather than the `requireCtx(p)` pattern. | Low. |
| `apps/gui/src/shared/ipc.ts` (CH ~line 60-62, `KanmerApi` ~line 393-397) | Channel constants + API signatures + the result type for the sweep listing (entry name, project root, has-replacement flag, reason). | Low — but the channel name and the API method must be added in both halves or the preload silently returns `undefined`. |
| `apps/gui/src/preload/index.ts` (~line 46-48) | Bridge the new channel(s). | Low. |
| `apps/gui/src/renderer/src/components/Settings.tsx` (`ConnectSection`, ~line 353+) | The sweep's UI: list the found entries, mark the ones with no replacement **prominently**, ask once, then apply. Also update the section's hint paragraph, which currently claims nothing is written outside the project. | **Medium.** The whole point of the ticket is that the warning is not skippable. A row that reads like the others is a silent data-loss button. |
| `apps/gui/src/main/providers.test.ts` (295 lines; codex block at line 157, and line 227 `keeps the legacy global cleanup…`) | New `describe` for the sweep core: the pegasus fixture (F3), the second-run no-op, malformed input, missing `--root`, and an entry pointing at a project that no longer exists on disk. New assertions that grok's unmerge leaves a foreign-shaped entry alone. Line 227's existing test may need rewording if the per-project `removeCommands` behaviour changes. | Low, high value. |
| `apps/gui/src/main/connect.test.ts` (47 lines) | Test that `disconnectAgent("grok", root)` leaves a Claude-written `.mcp.json` entry byte-intact, and that `isRegistered` no longer reads a Claude entry as grok's. | Low. |
| `docs/architecture/adr/ADR-0007-codex-project-config.md` (Consequences, line 21) | Amend: "the global pile drains as projects reconnect" is true only for projects that are actually reconnected, nothing tells the user which ones still owe one, and the reconciliation sweep is what actually drains the pile. | Low. Explicitly in scope. |
| `docs/functional/frd/FRD-012-connect.md` (R1 line 14, R4 line 17, AC-1 line 22) | R1's legacy-cleanup clause gains the sweep; R4 ("Disconnect reverses exactly what connect wrote") gains the ownership rule it currently implies but does not state; AC-1 gains the machine-wide case. | Low. |

### Files that need touching only under one design choice

| Path | When | Risk |
| --- | --- | --- |
| `apps/gui/src/renderer/src/lib/client.ts` (line 53) and `apps/gui/src/renderer/src/lib/readOnly.test.ts` (the `names` array, line 8-14) | Only if the sweep is exposed as a `ProjectClient` method rather than a bare `window.kanmer.*` call. `readOnly.test.ts` enumerates every `ProjectClient` member by hand and will fail if one is added without it. `readOnly.ts`'s doc comment already explains why connect-family calls are *not* write methods — the sweep is the same category, and the comment should say so. | Low, but it fails loudly if missed. |
| `packages/ui/src/demo.tsx` (line 560-561) | Only if the sweep lands on `ProjectClient`; the demo stubs every client method and would need one more "Not available outside the Kanmer app." entry. | Low. |
| `docs/manual/troubleshooting.md` | Optional: a "codex loads a board from another project" entry. Reasonable, not required. | Low. |

## Ripple effects

- **Build artifacts.** `packages/ui/dist/index.d.ts` mirrors `client.ts` and is
  generated — it will change on its own if the sweep lands on `ProjectClient`,
  and must not be hand-edited.
- **The in-app manual does not ripple.** `scripts/build-manual.mjs` compiles a
  *curated* list of eight FRDs (`FROM_FRD`, lines 28-38) plus two hand-written
  chapters; **FRD-012 is not among them** and ADRs never are. So amending either
  doc does not stale `chapters.generated.ts` and `npm run build:manual --check`
  stays green. This is worth knowing precisely because the repo's convention
  makes you assume otherwise.
- **The Connect UI's promise.** `Settings.tsx`'s hint says registration happens
  "so nothing is written outside this project." A machine-wide sweep contradicts
  it. The copy is part of the change, not an afterthought.
- **`codex` on PATH.** If removal goes through `codex mcp remove`, a machine
  without the CLI can list but not drain. `connectAgent` already swallows CLI
  failures with `.catch(() => undefined)` — the sweep must *not* copy that
  pattern, because a silently-failed sweep that reports success is worse than no
  sweep. It needs the copy-paste fallback the rest of Connect gives (FRD-012 AC-4).
- **Idempotency is the ADR-0010 contract**, and it comes free from the data:
  after a successful pass there are no `kanmer-*` keys left to find, so a second
  run finds nothing. The test that matters is the *unsuccessful* pass — entries
  deliberately kept back because they had no replacement must still be there,
  still reported, and still not removed, on run two.
- **`.design-sync/previews/Settings.tsx`** is an untracked scratch copy (see
  `git status`), not a second source of truth. Do not edit it.
- **No MCP-server-side ripple.** Everything here is GUI main process + docs; the
  `packages/mcp-server` surface is untouched.

## Deliberately out of scope

- Migrating grok off `.mcp.json` onto its own config file. That is one candidate
  answer to the ownership question, and if chosen it is a larger change (new
  path, new merge, migration of existing grok users) that deserves its own
  ticket rather than riding along in a fix.
- The stale-install-path problem (a moved install dir leaving every project's
  registration pointing at a path that no longer exists) — tracked separately,
  noted in `AGENTS.md:494` and GUI-061's plan. The sweep will *see* those entries
  and should not try to repair them.
- Sweeping any host other than codex. Claude, opencode, Antigravity and grok all
  register project-scoped; only codex ever wrote a per-project *global* entry.
- Rewriting `codexServerName`. It is still correct for what it does; the sweep
  reads the entries it produced rather than depending on being able to
  reconstruct them.

## Context files an implementer must read first

| Path | What it tells you |
| --- | --- |
| `apps/gui/src/main/providers.ts:142-204` | `codexTomlMerge`/`codexTomlUnmerge` and the comment explaining why the unmerge is "surgical". That reasoning applies with far more force to the global file — read it before reaching for the same parse/stringify pair (F1). |
| `apps/gui/src/main/providers.ts:206-264` | `codexTrustFromConfig` — the existing precedent for *reading* the global config as a pure function over a string and returning a classification rather than acting. The sweep core should be shaped exactly like this. It also shows the path-normalisation (`norm`) that the has-replacement probe needs: keys are lowercased on Windows and quoted inconsistently. |
| `apps/gui/src/main/connect.ts:116-142` | `isRegistered` and `hasRegisteredCopySkillsPeer` — the second, undocumented consumer of `mcpServers.kanmer`, and the reason the ownership rule cannot live only inside `unmerge` (F4). Note its deliberate "malformed → return true" bias. |
| `apps/gui/src/main/connect.ts:247-272` | The config-file branch of `connectAgent`, including the best-effort `removeCommands` loop the sweep generalises, and `writeAtomic` (temp + rename) — the write discipline any file mutation here must keep. |
| `apps/gui/src/main/providers.test.ts:157-232` | The existing codex TOML test block, including the "byte-stable on re-merge" and "leaves an unparseable file exactly as found" tests. The new sweep tests belong beside these and should honour the same two properties. |
| `C:\Users\PC\.codex\config.toml` | The real shape the sweep parses: 65 `[projects.'…']` trust tables with backslash paths and mixed quoting, `[plugins."name@marketplace"]` dotted-quoted headers, `[hooks.state.'C:\…json:pre_tool_use:0:0']`, a float `startup_timeout_sec`, and only two `mcp_servers`. Read a slice of it before writing any parser test — the fixtures need to look like this, not like a tidy example. |
| `C:\Users\PC\Documents\GitHub\pegasus\.codex\config.toml` | The written entry shape, including the `--root` / `--repo-root` args pair the sweep recovers the project root from (F2), and a neighbouring non-Kanmer server (`mcp_microsoftdocs`) that must survive. |
| `docs/architecture/adr/ADR-0007-codex-project-config.md` | The decision being amended, and the sentence at line 21 this ticket rewrites. |
| `docs/architecture/adr/ADR-0010-setup-is-reconciliation.md` | Why the sweep is list-then-confirm and never silent: the GitHub-issue clause sets the precedent for "a destructive external action, so list-then-confirm", and "idempotency machinery is mandatory, not optional". |
| `docs/functional/frd/FRD-012-connect.md` | R1's registration matrix, R4's disconnect rule, and AC-1/AC-4 — the acceptance criteria the change is measured against. |
| `docs/plans/kanmer-v3/phase-1-connect/plan.md:39-44` | The provider re-verification footer from item 1.3, which records the grok `.mcp.json` decision and the `codex mcp remove` verification — the prior art for FRD-012 R5, which asks for facts to be re-verified at implementation time. |
