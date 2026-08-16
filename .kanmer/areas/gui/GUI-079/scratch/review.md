## Review — GUI-079, PR #47

**I am both author and reviewer of this PR. This is a self-review and should not
be read as an independent one.** What that costs is stated at the end.

### Changes (reviewer's reading of the diff, not the author's)

`providers.ts` carries the weight. grok's `configPath` moves from `.mcp.json` to
`.grok/config.toml` and it now shares codex's TOML merge/unmerge pair, renamed
`codexTomlMerge`/`Unmerge` → `tomlMcpServersMerge`/`Unmerge`. Both remain
module-private, so the rename costs nothing outside the file. A third pure
function, `registrationState`, joins `merge`/`unmerge` on the `configFile`
register spec, with three implementations — JSON `mcpServers` (antigravity),
JSON `mcp` (opencode), TOML `mcp_servers` (codex, grok) — over a shared
`hasKanmerUnder`. Then ~150 lines of new sweep core: `legacyCodexEntries` parses
a global config string and returns `{ name, projectRoot }` per legacy entry, and
`classifyLegacyCodexEntry` turns an entry plus a caller-supplied probe into a
five-way status with `removable`/`recommended`/`detail`. Both pure; neither
writes anything.

`connect.ts` loses the hardcoded JSON shape from `isRegistered` (now a delegation
plus the `!== "absent"` bias) and gains two exported IO functions:
`scanLegacyCodexRegistrations` reads `~/.codex/config.toml`, probes each recorded
project root, classifies; `drainLegacyCodexRegistrations` re-scans, intersects
the requested names with what is currently removable, then runs one
`codex mcp remove` per surviving name, catching per entry.

`ipc.ts`/`preload`/`index.ts` add two machine-scoped channels with no
`projectId`. `Settings.tsx` gains a `LegacyCodexSweep` component that returns
`null` on an empty scan, and the section hint loses its "so nothing is written
outside this project" tail in favour of a positive claim about where
registrations land. `styles.css` gives the kept rows a red border and background.

Docs: ADR-0007's Consequences amended, ADR-0012 added, FRD-012's R1 rewritten
with new R1a/R1b, R4 extended, AC-6/AC-7 added, an upgrade note, and GUI-079
struck from its own open-work list.

### Comments

1. **[blocking — fixed in PR, `b72c0a1`] The sweep could hand a shell an
   arbitrary string.** `legacyCodexEntries` matched by `name.startsWith("kanmer-")`
   and the name is interpolated into `codex mcp remove <name>`, run through
   `exec` (a shell). TOML *quoted* keys may legally contain anything, so
   `[mcp_servers."kanmer-x; rm -rf ~"]` in a hand-edited or hostile global config
   would have been offered as a removable row and then executed. `q()` does not
   save it — it only quotes on whitespace or a double quote. Now matched against
   `/^kanmer-[A-Za-z0-9_-]+$/`, which is exactly what `codexServerName` can
   produce, so the check is both a safety fix and more correct about what "ours"
   means. Named test added.

2. **[non-blocking — fixed in PR, `b72c0a1`] The UI dropped `refused`.** The main
   process re-derives removability at drain time and reports back anything it
   refused; the renderer computed nothing with it. That list is only ever
   non-empty when the panel and main disagree, which is precisely when it should
   be visible. Now rendered.

3. **[non-blocking — won't do] `LegacyCodexScan`/`Finding` are declared twice**,
   in `providers.ts` (main's own) and `ipc.ts` (the renderer contract), and stay
   in sync structurally rather than by import. That is the existing convention
   for every IPC payload here — `ConnectResult`, `SkillsStatus`, `ProviderInfo`
   all do it — because `shared/ipc.ts` must not import from `main/`. Following
   the house pattern beats a one-off.

4. **[non-blocking — won't do] The plan said `isRegistered(): boolean`; the code
   ships `registrationState(): "registered" | "absent" | "indeterminate"`.** The
   boolean silently dropped the pre-existing "malformed config → keep the shared
   AGENTS.md block" bias, and the existing peer-safety test caught it. The
   divergence is recorded in the checklist's progress notes and in ADR-0012, so
   the plan is not left lying. Correct call, correctly written down.

5. **[non-blocking — filed as a note, not a ticket] The refusal rows' safety is
   visual.** `.legacy-row.blocked` has no checkbox in the DOM at all, which is
   the real guarantee, and main re-checks removability regardless — so a CSS
   regression degrades to "looks less alarming", not "removes the wrong thing".
   Two layers deep is enough; a screenshot test for this one panel is not.

### Checks performed

- **Report against diff** — `post-implementation-report.md`'s change table lists
  every file in `git diff --stat` and the rationales match what the code does. It
  is honest about the pre-existing `kanmerGit.test.ts` failure rather than
  quietly reporting a green suite.
- **Governing docs** — the plan's Governing-docs section holds. ADR-0007 and
  FRD-012 are modified with authorization (the ticket body directs the ADR
  amendment; the operator answer directs the FRD note). ADR-0012 was actually
  written, not merely promised, and its "Decision" matches the shipped
  `registrationState` tri-state rather than the plan's earlier boolean. ADR-0010
  is met by construction: after a successful pass `legacyCodexEntries` finds
  nothing, and the held-back case is a named test at run two.
- **The operator's four answers, against the code** — grok is off `.mcp.json`
  (asserted for *every* provider, not just grok); `isRegistered` moved with it;
  the sweep is in the Connect panel with `Settings.tsx` + IPC in scope; entries
  with a replacement are drainable and entries without one have no removal path
  at all. No auto-migration anywhere in the diff.
- **The two research traps** — the global TOML is never passed to
  `TOML.stringify` (`legacyCodexEntries` parses and returns; removal shells out),
  and the has-a-replacement probe keys on `--repo-root ?? --root`, with a
  colliding-basenames test proving the name is not consulted.
- **Ripple effects from `files`** — the sweep landed on `window.kanmer` rather
  than `ProjectClient`, so `readOnly.test.ts` and `packages/ui/src/demo.tsx`
  correctly did not need touching; `check:manual` is green, confirming the
  FRD-012 edit does not stale the manual as predicted.
- **Rails** — `npm test` 230/231 (the one failure pre-existing and environmental,
  proven by stashing the change and running that file on the base commit),
  `typecheck` clean, `verify:agents-block` 26/26, `check:manual` up to date,
  `build -w @kanmer/gui` builds.
- **Empirical claims re-run, not trusted** — the `codex mcp remove` fixture proof
  was executed in this session before the code was written, not quoted from
  research.

### What this review cannot give you

An independent reader. The blocking find above is real and was caught by reading
the diff as a shell-injection surface rather than as the change I had just
written, but a second pair of eyes would most plausibly push on two things I have
signed off on my own judgement: the decision to make `orphaned` entries removable
at all (Q7, mine to resolve, and the one place I extended past the operator's
strict binary), and whether the Connect hint's rewrite still promises what a user
would read it as promising.

### Verdict

**Pass.** Merging per standing delegation, then Verifying.
