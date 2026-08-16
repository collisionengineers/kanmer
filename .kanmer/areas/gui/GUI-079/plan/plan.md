# Plan — GUI-079: Connect writes and deletes registrations it does not exclusively own

Written FROM `files`, `scratch/research.md` and `scratch/operator-answers.md`.
The four operator decisions are settled inputs, not options to re-open.

## Approach

Two defects, one shape — Connect reaches registrations it does not exclusively
own — and the operator picked the structural fix for each rather than a
heuristic.

**Ownership (Q1 = option c).** grok stops writing `.mcp.json` and moves to a file
grok alone owns. Re-verified against the installed grok CLI's own docs
(`~/.grok/docs/user-guide/07-mcp-servers.md`, FRD-012 R5): grok's *native*
project config is **`.grok/config.toml`**, `[mcp_servers.<name>]` with
`command`/`args`/`env` — the exact shape codex's project file already uses — and
it is the **highest-priority** source. `.mcp.json` is only a *compat* source for
grok: lowest priority in the merge order, and read at all only while the Claude
import marker is unset. So the move is not merely a de-collision, it registers
grok somewhere strictly more reliable. Once grok is off it, **no Kanmer provider
merges or unmerges `.mcp.json` at all** — Claude reaches it through
`claude mcp add -s project`. The collision is gone by construction, which beats
every marker or fingerprint rule that has to keep being right.

**The read moves with the write.** `isRegistered` is the second consumer of
`mcpServers.kanmer` (F4), so the ownership question is pushed *into the provider
registry* as a third pure function beside `merge`/`unmerge`:
`register.isRegistered(contents)`. The provider that owns the file answers what
counts as registered in it — one place, unit-testable, and impossible to fix on
the write side while forgetting the read side again. It also fixes a latent
second bug: `isRegistered` only ever `JSON.parse`d, so it could never have
answered for a TOML-configured host.

**The sweep (Q2/Q3/Q4).** A pure core in `providers.ts` that parses the global
TOML for **listing only** — never `TOML.stringify` (F1, proven destructive) —
plus a classifier taking a per-project probe. `connect.ts` does the IO and
delegates removal to `codex mcp remove`. It lives in the GUI's Connect panel
behind one prompt. Entries with a project-scoped replacement may be drained;
entries without one are **reported and never removable**.

**Q5 is now proven, not assumed.** `codex mcp remove` was run against a synthetic
`CODEX_HOME` fixture carrying `startup_timeout_sec = 120.0`, literal-quoted
`[projects.'c:\…']` headers, a top-of-file comment and a second MCP server. It
excised exactly the `[mcp_servers.kanmer-pegasus]` block (and its own preceding
comment) and left every other byte identical — `diff` shows a single deletion
hunk. Delegating removal is safe; round-tripping is not.

## Governing docs

- **`docs/architecture/adr/ADR-0007-codex-project-config.md` — Modifies**
  (authorized: the ticket body and the operator answer both direct it). The
  Consequences sentence "the global pile drains as projects reconnect" is true
  only for projects that are actually reconnected, and nothing tells the user
  which ones still owe one. Amended to state the real precondition and to name
  the reconciliation sweep as the thing that drains the pile. Step 13.
- **`docs/functional/frd/FRD-012-connect.md` — Modifies** (authorized: same).
  R1's registration matrix gains grok's real file (`.grok/config.toml`) in place
  of "as shipped"; R1's legacy-cleanup clause gains the machine-wide sweep; R4
  gains the ownership rule it currently only implies; a new AC covers the sweep's
  refusal case; an **Upgrade note** records that existing grok users must
  reconnect once. Step 14.
- **New ADR — `ADR-0012-hosts-own-their-registration-file.md`.** The decision
  "a host is registered only in a file that host alone owns, and Kanmer
  unregisters only from files it owns" is a design decision with consequences
  past this ticket (it is the rule that says *don't* auto-migrate, and the rule
  the next host added must follow). Written via `kanmer-docs` and linked into
  `refs`. Step 15.
- **`ADR-0010-setup-is-reconciliation.md`** (not in `refs`, but binding here) —
  **Meets.** The sweep is list-then-confirm over a destructive external action,
  and idempotent: after a successful pass no `kanmer-*` key remains to find, and
  entries held back are still held back on run two. Steps 6, 11.
- **`ADR-0009-skills-are-not-the-contract.md`** — **Meets** by re-verification:
  every grok fact in this plan comes from the installed CLI's shipped docs and
  `--help`, read today, not from the phase-6 research that first chose
  `.mcp.json`.

## Steps

**Ownership — `providers.ts`**

1. Rename the private `codexTomlMerge`/`codexTomlUnmerge` to
   `tomlMcpServersMerge`/`tomlMcpServersUnmerge` (host-neutral: codex and grok
   write the identical `[mcp_servers.kanmer]` shape). Docblock records that both
   hosts share it and why the parse/serialise tradeoff is acceptable for a small
   *project* file and not for the global one.
2. Point grok's `register` at `configPath: ".grok/config.toml"` with that
   merge/unmerge pair. Replace the stale "prefer `.mcp.json`" comment with the
   verified fact table: native project config, highest priority, `.mcp.json` is
   a conditional lowest-priority compat source that Claude also owns.
3. Add `isRegistered(existing: string): boolean` to the `configFile`
   `RegisterSpec` and implement three pure predicates —
   `jsonMcpServersHasKanmer` (antigravity), `opencodeHasKanmer` (opencode),
   `tomlHasKanmer` (codex, grok). Each returns false on a parse failure; the
   *caller* keeps the "indeterminate → keep shared instructions" bias so the
   predicates stay honest.

**Ownership — `connect.ts`**

4. `isRegistered(provider, root)` delegates to
   `provider.register.isRegistered(contents)`. Unchanged either side of it:
   missing file → false, thrown/unreadable → true (the deliberate bias, with its
   comment kept). Nothing else in `disconnectAgent` changes — the unmerge is
   already surgical, and once grok is off `.mcp.json` there is no shared file
   left for it to over-reach into.

**The sweep — pure core in `providers.ts`**

5. `legacyCodexEntries(globalConfigToml: string | null): LegacyCodexEntry[]` —
   `TOML.parse` in a try/catch (unparseable → `[]`: report nothing rather than
   guess), take `mcp_servers` keys matching `^kanmer-`, and recover
   `projectRoot` from `args` as `--repo-root ?? --root` (F2), `null` when the
   entry has no args or no such flag. Plain `mcp_servers.kanmer` is **not** in
   scope: `codexServerName` never produced it globally, and a user's own global
   `kanmer` is not Kanmer's to delete.
6. `classifyLegacyCodexEntry(entry, probe)` — pure, given a
   `{ exists, hasProjectRegistration, trust }` probe (or `null`). Five outcomes:
   - `unknown-root` — no recoverable project root. Not removable.
   - `orphaned` — the folder does not exist. Removable, **never pre-selected**,
     worded so an unmounted drive reads as a reason to leave it (Q7).
   - `no-replacement` — folder exists, no `[mcp_servers.kanmer]` in its
     `.codex/config.toml`. **Not removable**, and the detail names the project
     and says: open it and click Connect first. This is the operator's refusal.
   - `untrusted` — a replacement exists but `codexTrustFromConfig` does not say
     `trusted`, so codex still loads only the global entry (Q8). Not removable;
     the detail says to trust the folder. `maybe-via-ancestor` counts as not
     trusted on purpose — the harsh direction leaves the entry in place.
   - `drainable` — replacement present and the folder is trusted. Removable and
     pre-selected.

**The sweep — IO in `connect.ts`**

7. `scanLegacyCodexRegistrations()` — read `~/.codex/config.toml`, run the core,
   probe each root (`existsSync`, then `tomlHasKanmer` over
   `<root>/.codex/config.toml`, then `codexTrustFromConfig` over the same global
   string already in hand), classify, return `{ configPath, findings }`.
8. `drainLegacyCodexRegistrations(names)` — **re-scan first** and intersect with
   what is currently `removable`, so a renderer bug or a stale list can never
   remove a protected entry. Then one `codex mcp remove <name>` per entry,
   best-effort *per entry* (one failure must not abort the rest), each result
   carrying `ok`, `output` and the exact `command` for the copy-paste fallback
   (FRD-012 AC-4). No `.catch(() => undefined)`: a silently-failed drain that
   reports success is worse than no sweep (Q6 — a missing `codex` shows up here
   as every entry failing with its command to run by hand). Returns the results
   plus a refreshed scan.

**Wiring**

9. `shared/ipc.ts`: two channel constants, the `LegacyCodexFinding` /
   `LegacyCodexScan` / `LegacyDrainResult` types, and two `KanmerApi` methods.
   Machine-scoped, so they take no `projectId` and follow the `listProviders`
   pattern — which also keeps them off `ProjectClient`, so `readOnly.test.ts`
   and `packages/ui/src/demo.tsx` do not ripple.
10. `preload/index.ts`: bridge both channels. `main/index.ts`: two
    `ipcMain.handle` registrations beside `CH.listProviders`, no `requireCtx`.
11. `Settings.tsx` `ConnectSection`: scan on mount; render nothing when there are
    no findings (the no-op second run is invisible, as ADR-0010 wants). When
    there are: a headed sub-block listing every entry with its project path and
    detail; removable rows get a checkbox (pre-ticked only when recommended);
    non-removable rows render as warnings with no checkbox at all — a row that
    reads like the others is a silent data-loss button. One "Remove selected"
    button, then per-entry results with copy-paste commands. Also tighten the
    section hint so removing a *global* entry is plainly not a claim to write
    other projects' files (the operator kept that promise standing).

**Tests**

12. `providers.test.ts` — grok's configPath and TOML round-trip alongside the
    existing codex block; the three `isRegistered` predicates; and a sweep
    `describe` covering: the synthetic pegasus fixture (`no-replacement`
    reported, never removable), unparseable TOML → `[]`, a `url`-only entry with
    no args, an entry with no `--root`, two entries whose basenames collide but
    whose `--repo-root` differ, `orphaned`, `untrusted`, and the second-run
    no-op (a config with the drainable entries already gone still reports the
    held-back ones, still not removable).
13. `connect.test.ts` — `disconnectAgent("grok", root)` leaves a Claude-written
    `.mcp.json` **byte-intact**; and a Claude-only `.mcp.json` no longer makes
    grok count as a registered peer (disconnecting the one real copy-skills host
    now drops the AGENTS.md block instead of retaining it for a phantom).

**Docs**

14. Amend ADR-0007 Consequences (Governing docs, above).
15. Amend FRD-012 R1/R4, add the sweep AC and the grok Upgrade note.
16. Write `ADR-0012-hosts-own-their-registration-file.md` and `link_doc` it.
17. Record the grok reconnect-once note in the ticket's `## Outcome` — that is
    what `scripts/release-notes.mjs` drafts from, so it is how the release notes
    get told.

## Verification

`proof.md` is produced on merged main from:

- `npm test` — the new sweep, predicate and disconnect tests among them.
- `npm run typecheck`.
- `npm run verify:agents-block`.
- The recorded `codex mcp remove` fixture transcript (Q5): the `diff -u` showing
  one deletion hunk and `startup_timeout_sec = 120.0` plus the literal-quoted
  `[projects.'…']` headers surviving byte-identical.
- A `grok mcp list --json` / doc citation confirming `.grok/config.toml` is
  grok's native project scope, and the merge-order table showing `.mcp.json` is
  compat-only (FRD-012 R5 re-verification).
- `npm run check:manual` stays green — FRD-012 is not one of the curated FRDs
  `build-manual.mjs` compiles and ADRs never are (verified in `files`).

## Risks / open questions

- **Comment loss in `.grok/config.toml`.** The TOML merge parses and
  re-serialises, so a hand-written, committed team `.grok/config.toml` loses its
  comments the first time Connect touches it. This is the same tradeoff ADR-0007
  already accepted for `.codex/config.toml`, but grok's file is likelier to be
  human-authored. Mitigation: stated in ADR-0012's consequences; the alternative
  (`grok mcp add --scope project`, which is surgical) is rejected because a
  `kind: "cli"` provider cannot be probed by `isRegistered`, which would silently
  drop grok out of the AGENTS.md peer check — trading a cosmetic loss for a
  functional one.
- **Existing grok users go quiet until they reconnect.** By operator decision, no
  auto-migration. Mitigated by the FRD Upgrade note and the ticket Outcome; and
  the old `.mcp.json` entry keeps working through grok's compat path in the
  meantime, so the failure mode is a stale duplicate, not a dead host.
- **A wrong `exists: false` probe** (unmounted drive) makes a live project's only
  registration look orphaned. Mitigated: never pre-selected, and the row says so.
- **`Settings.tsx` copy is the safety mechanism**, not decoration. If the
  refusal rows are not visually distinct from the removable ones, the ticket has
  not been fixed. Called out for review.
