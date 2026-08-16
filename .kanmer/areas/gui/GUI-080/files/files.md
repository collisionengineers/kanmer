# Files — GUI-080

The change is small and concentrated: one main-process module does the work, one
registry module holds the stamp constant, one test file guards it. Everything
else is ripple.

## Where the change lands

| Path | What changes | Risk |
|---|---|---|
| `apps/gui/src/main/connect.ts` | `installSkills` (145-170) stops being an overlay: reconcile owned folders against the bundle, then stamp the roster. `removeBundledSkillsOnly` (99-114) reads the recorded roster instead of `readdir(bundledSkillsRoot)`. `updateSkills` (213-226) inherits both. | **High.** This is the only code that deletes inside a user-shared directory. A wrong ownership answer deletes a user's skill; a too-timid one leaves the bug. `rm(..., {recursive:true, force:true})` is unforgiving and the destination path is assembled from names read off disk — the existing `entry.name.includes("/")` guard at line 109 must survive whatever replaces it. |
| `apps/gui/src/main/providers.ts` | `SKILLS_VERSION_FILE` (66) stays, but its *contents* gain a roster. Likely a parse/serialise pair beside `isNewerVersion` (74-89), pure and unit-testable like the merges. | **Medium.** Format change to a file older Kanmer versions already read as a bare version string. Keep the version on line 1 so an old reader stays correct; anything else silently feeds `isNewerVersion` a garbage string. |
| `apps/gui/src/main/connect.test.ts` | Extend, do not replace. The existing case (14-33) is the "never touch a foreign skill" contract. Add: retired-folder pruned; unstamped install upgraded without collateral damage; stale file inside a surviving folder removed. | **Low**, but the tests are the only proof this fix is safe — a thin test set here is the real risk. |
| `apps/gui/src/main/providers.test.ts` | Cases for the stamp parse/serialise: round-trip, a legacy bare-version stamp, a corrupt stamp. | **Low.** |

## Context files

| Path | What it tells the implementer |
|---|---|
| `apps/gui/src/main/connect.test.ts:14-33` | The exact promise you must not break, already executable: a foreign `mycompany-review/` folder, a loose `user.txt` and their **bytes** survive removal. This test is the reason `rm -rf`-and-recopy is off the table; read it before choosing an ownership rule. |
| `apps/gui/src/main/providers.ts:294-389` | The installer never writes `.claude/skills/`. `claude`/`codex` are `marketplace`; the only `copySkills` destinations are `.agents/skills` (opencode **and** antigravity — one directory, two providers) and `.grok/skills`. Verify against those trees, not the one you can see in this repo. |
| `apps/gui/src/main/connect.ts:134-142` and `307-318` | `hasRegisteredCopySkillsPeer` exists because `.agents/skills` is shared: disconnect already refuses to drop the AGENTS block while a peer host is connected — and does **not** apply the same reasoning to the skills removal one line above. Precedent and gap in the same eight lines. |
| `apps/gui/src/main/connect.ts:188-210` + `apps/gui/src/renderer/src/components/Settings.tsx:417-437` | `updateAvailable` requires a strictly newer bundled version, and the "Update skills" button renders only when it is true. With `plugin.json` pinned at `0.1.0` the button never appears after the first install. Do not assume the affordance you are fixing is reachable. |
| `plugins/kanmer/.claude-plugin/plugin.json` | The single source of `bundledSkillsVersion()` — `"version": "0.1.0"`, never bumped while the app went to 0.2.0. |
| `docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md:9,17` | Two load-bearing facts: opencode also reads Claude-compatible `.claude/skills/` (so stale content there is live, not inert), and the roster must install **atomically as sibling directories** because every skill cross-references `kanmer-tickets/references/tool-reference.md`. A partial prune breaks that contract. |
| `docs/functional/frd/FRD-012-connect.md` R2/R4 | R2 makes the stamp the sanctioned mechanism ("All copies stamped (`.kanmer-skills-version`) with the existing update-offer flow") — extending it is inside the FRD, not a new invention. R4 — "Disconnect reverses exactly what connect wrote" — is the sentence `removeBundledSkillsOnly` currently violates. |
| `.gitignore:34-41` | States outright that `.claude/skills/` is a local install artifact and `plugins/kanmer/skills/` is canonical. Also warns that untracked files here block releases, which is why this tree is gitignored and why hand-editing it is invisible to CI. |
| `git show 130f837` | The retirement that caused this, and proof that retirement has two shapes: a deleted folder (`kanmer-import/`) **and** a renamed file inside a surviving folder (`kanmer-research/assets/impact-template.md` → `files-template.md`). Folder-level pruning alone leaves the second. |
| Ticket `CORE-023` | Names both residues and scopes itself to detection: "Reconciliation (FRD-013) is the repair path; this ticket is the detection." Keep the two consistent — whatever CORE-023 learns to detect, this must be able to repair. |

## Ripple effects

- **`connect.test.ts` and `providers.test.ts`** — the primary ripple; see the
  table above.
- **`skillsStatus` (`connect.ts:188-210`)** — reads the stamp with a bare
  `.trim()`. Any format change passes through here first. It is also the only
  reader outside install, so a first-line-is-version format contains the blast.
- **IPC surface** — `apps/gui/src/shared/ipc.ts:63-64,173-177,399-401`,
  `apps/gui/src/preload/index.ts:49-50`, `apps/gui/src/main/index.ts:622-626`,
  `apps/gui/src/renderer/src/lib/client.ts:55-56,111-112`. Unchanged if
  `SkillsStatus` keeps its shape; if the fix wants to *report* what it pruned,
  every one of these five files moves in lockstep, plus
  `apps/gui/src/renderer/src/lib/readOnly.test.ts:10-11`, which asserts the
  method allow-list.
- **`ConnectResult.output` prose** — `installSkills` returns
  `` `skills v${version} → ${dir}, AGENTS.md block ensured` ``, surfaced verbatim
  in Settings. Removals should be visible ("2 retired skills removed"), because
  a silent delete inside a user-shared directory is exactly the behaviour this
  ticket is meant to make accountable.
- **`Settings.tsx:405-410` hint prose** — still says opencode and Antigravity get
  "the shared AGENTS.md block for hosts that only read skills globally". They get
  a project `.agents/skills` copy (`providers.ts:353,385`). Stale, adjacent, cheap
  to fix while in the file.
- **Docs** — FRD-012 R2/R4 gain a sentence on reconciliation-not-overlay;
  ADR-0010's reconciliation principle is what this implements. Whether the ADR
  itself needs amending is an open question.
- **No committed build artifacts.** `apps/gui/out/**` contains stale compiled
  copies of these functions but is generated; `ds-bundle/` and `packages/ui/dist`
  match only on unrelated identifiers.

## Out of scope

- **The marketplace path being broken.** `installSkills:148` runs
  `claude plugin marketplace add <root>/plugins/kanmer` while the manifest lives
  at `<root>/.claude-plugin/marketplace.json`, and `electron-builder.yml:22-23`
  packages only `plugins/kanmer` — so a packaged build ships no marketplace
  manifest, and `codex` never runs `plugin add` at all. Owned by **MCP-009** and
  **MCP-011**. This ticket records the marketplace prune behaviour; it does not
  repair the marketplace install.
- **Bumping `plugin.json` to a real version.** It makes the "Update skills"
  button reachable and is arguably required for this fix to matter, but it is a
  release-process change with its own blast radius. Raised as an operator
  question rather than taken.
- **Disconnecting one `.agents/skills` peer while the other stays connected.**
  A real defect in `disconnectAgent:307-311`, adjacent but distinct: it is about
  *when* to remove, not *what* Kanmer owns. Open question decides whether it
  rides along.
- **`.claude/skills/` in this repo.** Not written by the installer; the
  operator's hand-made mirror. Leave it alone.
- **Detection/reporting of a stale install.** CORE-023's job.
