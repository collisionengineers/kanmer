# Open questions — GUI-080

All resolved. The three operator-only questions were answered on 2026-08-16 —
the full answer is in `scratch/operator-answers.md`; the decisions are recorded
inline below and carried into `plan`.

## Operator decisions (answered 2026-08-16)

- [x] **OPERATOR — Does the fix repair installs that predate the roster, or only
      stop the bleeding from here?**
      **Answered: repair them.** Ship the roster *and* the tombstone list. The
      two residues that prompted the ticket — `kanmer-import/` and
      `kanmer-research/assets/impact-template.md`, both retired by `130f837` —
      get cleaned on every machine. The tombstone list is **closed at exactly
      those two entries and never grows**: it repairs what retired before the
      roster existed, and every future retirement is the roster's job. That must
      be said in the code comment *and* in the FRD prose, because a tombstone
      list that grows is a second source of truth.

- [x] **OPERATOR — May install delete files *inside* a Kanmer-owned skill folder
      that the bundle no longer contains?**
      **Answered: yes — replace owned folders wholesale**, not merged. This is
      what fixes the renamed template; folder-level pruning alone would leave it
      behind. The cost is accepted **and must be reported, not silent**: a local
      edit inside a Kanmer-owned skill folder is discarded on install, so
      Connect names the folders it replaced. A user who customised
      `kanmer-execute/SKILL.md` in place needs to learn that from Kanmer, not
      from losing it. Foreign skills are never touched — the roster is what
      makes deletion safe, and prefix-matching `kanmer-*` was rejected precisely
      because it would delete a user's own `kanmer-mine`.

- [x] **OPERATOR — Should this ticket bump `plugins/kanmer/.claude-plugin/plugin.json`
      off `0.1.0`, or does that get its own ticket?**
      **Answered: no — [[MCP-011]] owns that bump**, and two tickets editing one
      file is a conflict. GUI-080's `proof` must then state plainly that while
      `plugin.json` sits at `0.1.0`, `bundledSkillsVersion()` can never report an
      update, so `Settings.tsx:417-437` never renders the "Update skills" button
      — the affordance this ticket repairs stays **unreachable until MCP-011
      lands**. Connect is the reachable entry point today.

## Technical questions (resolved in planning)

- [x] **What is the stamp's new format?**
      **Version on line 1, roster on the lines below.** `skillsStatus:203` reads
      the file and `.trim()`s the whole thing as the version, so a JSON stamp
      would feed an older Kanmer a garbage version string; a line-oriented stamp
      degrades to a harmless "no update available" instead. Parse/serialise are
      pure functions next to `isNewerVersion`, unit-testable without the
      filesystem — matching how `providers.ts` already works. `skillsStatus`
      itself is updated to parse the first line, so the current reader stays
      exactly correct.

- [x] **Does disconnecting opencode strip skills antigravity still needs?**
      **Yes today, and this ticket fixes it.** ADR-0009:17 makes roster
      atomicity a stated constraint, so a half-removed roster breaks every
      cross-skill reference — a real breakage, not cosmetic. It is ~6 lines
      inside `disconnectAgent`, a function already being rewritten, so it rides
      along rather than becoming its own ticket (the delegated judgement call,
      taken and stated in the report). The existing
      `hasRegisteredCopySkillsPeer` is not directly reusable: it answers "is
      *any* copy-skills peer registered", which would wrongly retain
      `.agents/skills` merely because grok — a different directory — is
      connected. It gains an optional `skillsDir` filter so the skills removal
      asks the narrower question, while the AGENTS-block call keeps its current
      broad semantics and its existing test.

- [x] **How is the marketplace prune behaviour recorded, given it could not be
      run?**
      **Record the layout evidence and the caveat, and name the live install as
      unchecked.** Both hosts extract plugins to
      `cache/<marketplace>/<plugin>/<version>/`, so they prune by construction
      *when the version moves* — which, frozen at `0.1.0`, it does not. Kanmer's
      marketplace is not registered on this machine
      (`known_marketplaces.json` lists only `claude-plugins-official`), and
      registering it is a mutation blocked anyway by the manifest-path defect
      MCP-009/MCP-011 own. The ticket's own verification item allows "or named
      as unchecked"; asserting more than was run is the failure ADR-0009 exists
      to prevent.

## Parked (explicitly deferred)

- [ ] **Should the fix reach `.claude/skills/` too?** ADR-0009:9 records that
      opencode reads Claude-compatible `.claude/skills/`, so stale content there
      is live — but no provider spec installs to it, and this repo's copy is the
      operator's hand-made mirror. Deferred: Kanmer cannot own a directory it
      never wrote, and the roster stamp would be absent there by definition.
      Reopens if a provider is ever given `.claude/skills` as a `skillsDir`, or
      if CORE-023's detection decides to report on it.

- [ ] **Should reconciliation run automatically rather than on a button?**
      FRD-013 R1 says "every run, setup detects state and reconciles", which
      hints at a scheduled or on-open reconcile rather than a Connect-triggered
      one. Deferred: this ticket makes the existing entry points correct, which
      is a precondition either way. Reopens when kanmer-setup's v3
      reconciliation work lands.

- [ ] **The marketplace registration path being broken.** `installSkills:148`
      runs `claude plugin marketplace add <root>/plugins/kanmer` while the
      manifest lives at `<root>/.claude-plugin/marketplace.json`, and
      `electron-builder.yml:22-23` packages only `plugins/kanmer` — so a
      packaged build ships no marketplace manifest, and codex never runs
      `plugin add` at all. Deferred: owned by **MCP-009** and **MCP-011**. This
      ticket records marketplace prune behaviour; it does not repair the
      marketplace install.
