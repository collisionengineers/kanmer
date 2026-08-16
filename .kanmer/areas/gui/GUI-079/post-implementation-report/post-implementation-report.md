# Post-implementation report — GUI-079

## Summary

Two defects with one shape — Connect reached registrations it did not
exclusively own — are fixed structurally rather than by heuristic. **grok moves
off `.mcp.json` onto `<root>/.grok/config.toml`**, so no Kanmer provider merges
or unmerges Claude's file at all and the collision cannot recur; the *read*
moves with the write, as a third pure function on the provider registry, which
also repairs the quieter half of the bug (a Claude-only project reported grok
connected, keeping the AGENTS.md block alive for a host never connected). And a
**machine-wide sweep in the Connect panel** now drains the global
`kanmer-<project>` entries pre-ADR-0007 versions scattered across
`~/.codex/config.toml`, refusing — with no override — to remove any entry that
is some other project's only working registration.

## Changes

| File | Change | Why |
|---|---|---|
| `apps/gui/src/main/providers.ts` | grok's `configPath` → `.grok/config.toml`, sharing codex's TOML merge/unmerge (renamed `codexTomlMerge`/`Unmerge` → `tomlMcpServersMerge`/`Unmerge`, both private) | The registration matrix change itself. The `[mcp_servers.kanmer]` shape is identical for both hosts, so this is a de-duplication, not a coupling. |
| `apps/gui/src/main/providers.ts` | New `registrationState(existing)` on the `configFile` `RegisterSpec`, with three pure implementations (JSON `mcpServers`, opencode `mcp`, TOML `mcp_servers`) | Ownership belongs to the provider that owns the file. Tri-state (`registered`/`absent`/`indeterminate`) because the two callers want opposite defaults for "cannot read this". |
| `apps/gui/src/main/providers.ts` | New pure sweep core: `legacyCodexEntries()` + `classifyLegacyCodexEntry()` with `LegacyCodexProbe`/`LegacyCodexFinding`/`LegacyCodexStatus` | Parses the global TOML **for listing only** and classifies against a caller-supplied probe, so the whole sweep is unit-testable without a real `~/.codex` — which matters, because the machine that reported the bug no longer reproduces it. |
| `apps/gui/src/main/connect.ts` | `isRegistered` delegates to `register.registrationState`, keeping missing→false and indeterminate→true | The read side of the ownership fix. Also repairs a latent bug: it only ever `JSON.parse`d, so it could never answer for a TOML host. |
| `apps/gui/src/main/connect.ts` | New `scanLegacyCodexRegistrations()` / `drainLegacyCodexRegistrations(names)` | The IO half. The drain **re-scans and intersects with what is currently removable** rather than trusting the renderer's list, and reports every per-entry failure with its command instead of swallowing it. |
| `apps/gui/src/shared/ipc.ts` | Two channels, `LegacyCodexFinding`/`Scan`/`Removal`/`DrainResult`, two `KanmerApi` methods | Machine-scoped, so no `projectId` — same shape as `listProviders`, which also keeps this off `ProjectClient` (no `readOnly.test.ts` / `packages/ui/demo.tsx` ripple). |
| `apps/gui/src/preload/index.ts`, `apps/gui/src/main/index.ts` | Bridge + two `ipcMain.handle` registrations beside `CH.listProviders` (no `requireCtx`) | Wiring. The handler also filters the incoming array to strings. |
| `apps/gui/src/renderer/src/components/Settings.tsx` | New `LegacyCodexSweep` component inside `ConnectSection`; hint copy tightened | The sweep UI. Renders **nothing** when there is nothing to report. Removable rows get a checkbox; kept rows are bordered warnings with **no checkbox at all**. |
| `apps/gui/src/renderer/src/styles.css` | `.legacy-sweep` / `.legacy-row.blocked` etc. | The refusal rows have to look unlike the removable ones — that visual difference *is* the safety mechanism, not decoration. |
| `apps/gui/src/main/providers.test.ts` | +11 tests: grok's path/TOML, "no provider writes `.mcp.json`", the tri-state predicates, and a full sweep `describe` | Covers every adversarial input the `files` doc named. |
| `apps/gui/src/main/connect.test.ts` | +2 tests against real temp projects | The two end-to-end ownership guarantees. |
| `docs/architecture/adr/ADR-0007-codex-project-config.md` | Consequences amended | Authorized by the ticket and the operator answer. |
| `docs/architecture/adr/ADR-0012-hosts-own-their-registration-file.md` | **New** | The ownership decision, with the rejected alternatives and the reason not to auto-migrate. |
| `docs/functional/frd/FRD-012-connect.md` | R1 rewritten for grok, new R1a/R1b, R4 extended, AC-6/AC-7, an Upgrade note; GUI-079 dropped from the open-work list | The requirements this change is measured against. |

## Governing docs

- **ADR-0007 — modified (authorized).** "The global pile drains as projects
  reconnect" now records its real precondition (only projects actually
  reconnected), names the sweep as what drains the pile, and states the two
  constraints the sweep carries: never remove a project's only registration, and
  never rewrite the global TOML.
- **FRD-012 — modified (authorized).** R1's matrix carries grok's real file;
  R1a states the one-host-one-file rule; R1b specifies the sweep including its
  refusal; R4 gains the "and nothing else" clause it previously only implied;
  AC-6 and AC-7 make both halves checkable; the Upgrade note tells grok users to
  reconnect once. GUI-079 is removed from the FRD's open-work list, since this
  is the ticket that closes it.
- **ADR-0012 — new.** The design decision behind option (c): a host is
  registered only in a file it alone owns. Records why the marker and
  fingerprint alternatives were rejected, why no auto-migration, and the
  accepted comment-loss cost on `.grok/config.toml`.
- **ADR-0010 — met.** The sweep is list-then-confirm over a destructive external
  action and idempotent: after a successful pass there is nothing left to find,
  and entries held back are still held back, still not removable, on run two.
- **ADR-0009 (method clause) / FRD-012 R5 — met.** Every grok fact here was
  established against the installed binary with the command recorded
  (`grok mcp add --help`, `~/.grok/docs/user-guide/07-mcp-servers.md`), and
  `codex mcp remove`'s formatting safety was proven against a fixture rather
  than inferred.

## Risks / follow-ups

- **Existing grok users go quiet until they reconnect** — by operator decision,
  no auto-migration. Their old `.mcp.json` entry keeps working through grok's
  compat path meanwhile, so the failure mode is a stale duplicate. Recorded in
  the FRD upgrade note and the ticket's Outcome (which is what
  `scripts/release-notes.mjs` drafts from).
- **`.grok/config.toml` loses comments** the first time Connect touches a
  hand-written one — the tradeoff ADR-0007 already accepted for
  `.codex/config.toml`, restated in ADR-0012's consequences. The surgical
  alternative (`grok mcp add --scope project`) would make grok a `kind: "cli"`
  provider with no config text to answer `registrationState` from, silently
  dropping it out of the AGENTS.md peer check.
- **A wrong `exists: false` probe** (unmounted drive) classifies a live
  project's entry as `orphaned`. Mitigated: never pre-selected, and the row's
  text says an unmounted drive is a reason to leave it. This is Q7's answer, not
  the operator's protected `no-replacement` case, which has no override at all.
- **Upstream MCP-014** (grok onto the plugin path, retiring `.grok/skills`) will
  touch grok's provider entry next; it is orthogonal to the registration file.
- **Not a follow-up, a note for review:** if the refusal rows ever stop looking
  different from the removable ones, the ticket is un-fixed. That is a UI
  property, so it wants eyes, not only a test.

## Verification hand-off

On merged `main`:

- `npm test` — expect the connect/providers suites green (62 tests across the
  two files). **`src/main/kanmerGit.test.ts` fails in this environment for
  unrelated reasons** — 5-second timeouts and `EPERM` on Windows temp dirs
  during `git worktree` operations. Confirmed pre-existing by stashing the whole
  change and running that file on the unmodified base commit.
- `npm run typecheck` — clean.
- `npm run verify:agents-block` — 26/26.
- `npm run check:manual` — up to date (FRD-012 is not one of the curated FRDs
  and ADRs never are, so neither doc edit stales the manual).
- `npm run build -w @kanmer/gui` — builds.
- Re-run the `codex mcp remove` fixture proof: a synthetic `CODEX_HOME` config
  with `startup_timeout_sec = 120.0`, literal-quoted `[projects.'c:\…']`
  headers, a comment and a second server; `diff -u` must show a single deletion
  hunk.
- `link_doc GUI-079 docs/architecture/adr/ADR-0012-hosts-own-their-registration-file.md`
  — deferred to post-merge, because `link_doc` validates the path against the
  main checkout and the ADR only exists on the branch until then.
