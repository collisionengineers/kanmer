# Research — GUI-080: how does Kanmer know which skill folders it owns?

## Question

Skill install is a pure overlay, so a skill Kanmer retires survives in every
project that ever installed it. Reconciliation (ADR-0010, FRD-013) requires that
after install the destination *matches the bundle for the skills Kanmer owns* —
while never touching skills the user wrote in the same directory. So: **what is
the ownership record**, what does each candidate cost on an install that predates
the mechanism, and where else does the fix ripple?

## Findings

### The three broken sites are confirmed, exactly as the ticket describes

- `installSkills` (`apps/gui/src/main/connect.ts:145-170`) is an overlay:
  `await cp(join(pluginRoot(), "skills"), dest, { recursive: true })` at line
  163. `cp` merges; it never deletes. A retired skill is not mentioned by the
  copy, so it stays.
- `updateSkills` (`connect.ts:213-226`) is a one-line wrapper around
  `installSkills`, so it inherits the overlay exactly.
- `removeBundledSkillsOnly` (`connect.ts:99-114`) enumerates
  `readdir(bundledSkillsRoot)` — the *currently bundled* folder names — and
  `rm`s each of those names from the destination. A retired skill is absent from
  that list, so disconnect leaves it too. The function's own doc comment says
  "Remove only the bundled skills Kanmer owns", which is the bug written down:
  it equates *owns* with *currently ships*.

### The destination is genuinely shared, so `rm -rf` really is wrong

`.claude/skills/` in this repo holds `run-kanmer` — the operator's own skill,
nothing to do with Kanmer. `connect.test.ts:14-33` is the existing guard: it
asserts that a foreign `mycompany-review/` folder, a loose `user.txt`, and their
bytes survive `removeBundledSkillsOnly`. Any fix must keep that test green.

### The live diff: the retired skill is already gone, by hand

`diff -rq plugins/kanmer/skills .claude/skills` reports exactly one difference:
`Only in .claude/skills: run-kanmer`. There is no `kanmer-import`, no
`assets/impact-template.md`, and **no `.kanmer-skills-version` file at all**.

Two things follow:

- The operator's manual deletion is the only reason this repo looks clean. The
  bug's evidence here is historical, not currently visible — which is precisely
  the failure mode: the residue is invisible until someone diffs by hand.
- `.claude/skills/` carries no version stamp, so it was **not** written by
  `installSkills`. It is a hand-made mirror (see the next finding). It is still
  a real skills-discovery path — ADR-0009:9 records that opencode reads
  Claude-compatible `.claude/skills/` — so stale content there is live, not inert.

### `.claude/skills/` is not a path the installer owns at all

`providers.ts:294-389`: `claude` and `codex` are `install.kind === "marketplace"`.
The only `copySkills` destinations are `.agents/skills` (opencode **and**
antigravity — the same directory, two providers) and `.grok/skills` (grok).
Neither exists in this repo. So the fix's blast radius in *this* checkout is
zero, and any manual verification must create one of those trees rather than
poking `.claude/skills/`.

`.gitignore:34-41` confirms the status of `.claude/skills/`: "a local copy of
the plugin skills (the canonical ones are `plugins/kanmer/skills/`)", untracked
deliberately. It is an install artifact; the source of truth is the bundle.

### Retirement has two shapes, and folder-level pruning only fixes one

`130f837` did two things:

- deleted `plugins/kanmer/skills/kanmer-import/SKILL.md` — a **whole folder**
  retiring;
- renamed `kanmer-research/assets/impact-template.md` → `files-template.md` — a
  **file inside a surviving folder** retiring.

CORE-023 names both symptoms together ("still shipping `impact-template.md` and
`kanmer-import`"). Pruning at folder granularity fixes the first and leaves the
second: an overlay `cp` into `kanmer-research/assets/` writes the new name and
keeps the old one, so the agent still finds a template that no skill references.
Fixing both means replacing each owned folder wholesale (`rm` the folder, then
`cp`) rather than diffing folder names — which is safe *because* the whole
folder is Kanmer's, and which additionally discards any local edits inside an
owned skill (correct per ADR-0009's "install-time copies", but worth stating).

### The existing stamp cannot do the job alone, and is currently inert

`SKILLS_VERSION_FILE = ".kanmer-skills-version"` (`providers.ts:66`) holds a
bare version string. `installSkills:164-166` writes it; `skillsStatus:201-209`
reads it and sets `updateAvailable = installedVersion !== null &&
isNewerVersion(bundledVersion, installedVersion)`.

`bundledVersion` comes from `plugins/kanmer/.claude-plugin/plugin.json`, which
is pinned at **`0.1.0`** and has never been bumped (the app ships 0.2.0). And
`Settings.tsx:417-437` renders the "Update skills" button **only when
`updateAvailable` is true**. So today the button is not merely buggy — after the
first install it is never shown at all. Re-running Connect is the only path that
reaches `installSkills`. Any claim that "the fix makes Update skills prune" is
false until the bundled version actually moves.

### Marketplace hosts prune by construction — evidenced, not assumed

I could not run `claude plugin install kanmer@kanmer` here: `known_marketplaces.json`
lists only `claude-plugins-official`, so Kanmer's marketplace is not registered
on this machine and installing it would be a mutation, out of scope for research.
What is checkable read-only is the on-disk layout both hosts use:

- `~/.claude/plugins/installed_plugins.json` → `installPath:
  "…\\.claude\\plugins\\cache\\<marketplace>\\<plugin>\\<version>"`.
- `~/.codex/plugins/cache/<marketplace>/<plugin>/<version>/` — e.g.
  `openai-bundled/chrome/26.715.71837` and `…/26.803.81509` coexisting.

Both hosts key the extracted plugin tree by **version**, so upgrading to a new
version materialises a fresh directory and a retired skill cannot survive it.
Both CLIs also expose removal verbs (`claude plugin prune|autoremove`,
`codex plugin remove`). The conclusion — marketplace hosts do not need Kanmer's
prune — holds **only while the plugin version changes**; at a frozen `0.1.0` the
host may legitimately reuse the same cache directory, which puts marketplace
hosts in the same trap. Recorded as evidence-plus-caveat rather than "verified":
the command that would settle it (`claude plugin install kanmer@kanmer` twice
across a retirement) was not run.

### Adjacent breakage found, already owned elsewhere

`installSkills:148` calls `provider.install.marketplaceCommands(pluginRoot())`,
i.e. `claude plugin marketplace add <root>/plugins/kanmer`. The marketplace
manifest is at `<root>/.claude-plugin/marketplace.json` — the **repo root** —
and `apps/gui/electron-builder.yml:22-23` packages only `plugins/kanmer`, so the
manifest is absent from a packaged build entirely. `codex` also registers a
marketplace but never runs `codex plugin add kanmer`. Both belong to MCP-009
(plugin-install parity) and MCP-011 (the two plugin manifests ship a
registration that cannot work) — noted here as the likely reason the operator
hand-mirrored `.claude/skills/` in the first place, and deliberately not this
ticket's work.

## The ownership options, costed

The question is what authority answers "may I delete this folder?".

| Option | Authority | Pre-mechanism install | Verdict |
|---|---|---|---|
| **A. Roster in `.kanmer-skills-version`** | The stamp records the names installed last time | Stamp exists but has no roster → nothing can be pruned this cycle; the roster appears only after the first post-fix install, so retirements *already* in the field (`kanmer-import`) are never repaired | The right forward mechanism; needs a partner for history |
| **B. Marker file inside each installed folder** | `.kanmer-owned` (or similar) beside each `SKILL.md` | No markers anywhere → every existing folder reads as unowned; needs an adoption pass that falls back to a heuristic, i.e. option A's problem plus a new file in every skill dir that hosts will list, index and possibly show to the agent | Rejected: same cost as A, extra surface, pollutes a directory whose contents hosts parse |
| **C. Existing version stamp + a shipped version→roster history table** | "You are stamped 0.1.0; here is what 0.1.0 shipped" | Fully repairs pre-mechanism installs, including `kanmer-import` | Rejected as primary: requires maintaining a historical roster table forever, and it is useless where no stamp was written at all (this repo's `.claude/skills/` — the one place we have real residue) |
| **D. Name prefix `kanmer-*`** | Convention | Works retroactively on every install ever made, needs no state | Rejected as the authority, viable as a bounded fallback: it deletes a user's own `kanmer-anything` folder. `run-kanmer` survives (wrong end), but `kanmer-mine` would not |
| **E. Tombstone list of known-retired names** | A short shipped constant: names Kanmer used to install and no longer does | Repairs exactly the historical cases with zero false positives | The precise complement to A |

**Recommendation: A + E.** The stamp grows a roster and becomes the authority
for everything Kanmer installs from now on; a small shipped tombstone list
(`kanmer-import`, plus the intra-folder `kanmer-research/assets/impact-template.md`)
repairs what retired before the roster existed. The tombstone list is a closed
set that never grows — once the roster ships, every future retirement is covered
by A — so it is not a maintenance burden in the way option C's full history
table would be. Option D is *not* recommended even as a fallback: it converts a
naming convention into deletion authority over folders Kanmer never wrote, and
the whole reason `removeBundledSkillsOnly` exists is that Kanmer promised not to
do that.

The stamp's format change needs care. `skillsStatus:203` does
`(await readFile(marker,"utf8")).trim()` and treats the whole file as the
version. A structured stamp (JSON) read by an *older* Kanmer would yield a
version string like `{"version":"0.2.0",…}`, which `isNewerVersion` compares
lexically — garbage, though harmlessly so (it only drives a button). A
first-line-is-the-version format keeps old readers correct by construction and
is the cheaper option.

## Implications

- The fix is three coordinated changes in one file: stamp what was installed,
  prune the delta on install/update, and make disconnect read the record rather
  than the live bundle. `removeBundledSkillsOnly`'s third parameter
  (`bundledSkillsRoot`, the test's seam) becomes a fallback rather than the
  primary input, so `connect.test.ts` needs extending, not rewriting.
- Prune at folder granularity **plus** replace-not-merge inside owned folders,
  or `impact-template.md`-class residue survives the fix and CORE-023 stays half
  true.
- `.agents/skills` is written by two providers. A prune that fires on
  disconnecting opencode while antigravity is still connected would strip a
  connected host's roster — and ADR-0009:17 makes roster atomicity a *stated
  constraint*, because every skill cross-references
  `kanmer-tickets/references/tool-reference.md`. `hasRegisteredCopySkillsPeer`
  already exists for exactly this reasoning on the AGENTS block
  (`connect.ts:134-142, 312-318`) but is **not** applied to the skills removal.
  Whether this ticket fixes that or files it is an open question.
- Verifying the fix in this checkout means creating `.agents/skills` or
  `.grok/skills`, not editing `.claude/skills` — the installer never touches the
  latter.
- Claiming the marketplace hosts are safe requires the version to move. Frozen
  at `0.1.0`, the "Update skills" affordance is dead and marketplace prune-by-
  version-directory is not guaranteed.
