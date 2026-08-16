# Open questions — GUI-080

Three of these are **operator-only** and are flagged as such — they are policy
calls about deleting files in a directory the user shares with Kanmer, and about
release process. They are raised now, not at planning time.

## Operator decisions (only the user can answer)

- [ ] **OPERATOR — Does the fix repair installs that predate the roster, or only
      stop the bleeding from here?** The ticket's Approach says "fall back to the
      current behaviour when the record predates this change", which means
      `kanmer-import` and `impact-template.md` — the two residues CORE-023
      actually names — are never cleaned by any Kanmer version, on any machine.
      The alternative is a shipped tombstone list of known-retired names
      (option E in `research`), which repairs exactly those with zero risk of
      touching a user folder. **Recommendation: ship the tombstone list.** It is
      a closed set of two entries that never grows, because every future
      retirement is covered by the roster.

- [ ] **OPERATOR — May install delete files *inside* a Kanmer-owned skill folder
      that the bundle no longer contains?** Folder-level pruning does not fix
      `kanmer-research/assets/impact-template.md`; only replacing each owned
      folder wholesale (`rm` then `cp`) does. The cost is that any local edit
      inside an owned skill folder is discarded on every install — defensible
      under ADR-0009 ("install-time copies", the bundle is the source of truth),
      but it is a real behaviour change and it is your directory.
      **Recommendation: yes, replace owned folders wholesale**, and say so in the
      Connect output so the deletion is accountable rather than silent.

- [ ] **OPERATOR — Should this ticket bump `plugins/kanmer/.claude-plugin/plugin.json`
      off `0.1.0`, or does that get its own ticket?** It is pinned at `0.1.0`
      while the app ships 0.2.0, and `Settings.tsx:417-437` renders "Update
      skills" only when the bundled version is strictly newer than the stamp —
      so after the first install the button is never shown, and the affordance
      this ticket is fixing is unreachable. It also decides whether marketplace
      hosts prune: both Claude Code and codex extract plugins to
      `cache/<marketplace>/<plugin>/<version>/`, so they prune by construction
      *only when the version moves*. **Recommendation: file it separately** —
      it is a release-process change (who bumps it, and when) rather than a
      correctness fix — but GUI-080's proof must then state plainly that the
      button remains unreachable until it lands.

## Technical questions (resolvable in planning)

- [ ] **What is the stamp's new format?** `skillsStatus:203` reads the whole file
      and `.trim()`s it as the version, so a JSON stamp would feed an older
      Kanmer a garbage "version" string (harmless — it only drives a button —
      but wrong). **Recommendation: version on line 1, roster on the lines
      below.** Old readers stay correct by construction; the parser is a pure
      function next to `isNewerVersion` and unit-testable without the filesystem,
      matching how `providers.ts` already works.

- [ ] **Does disconnecting opencode strip skills antigravity still needs?**
      Both providers install to `.agents/skills` (`providers.ts:353,385`), and
      `disconnectAgent:307-311` calls `removeBundledSkillsOnly` unconditionally
      — while `hasRegisteredCopySkillsPeer` (`connect.ts:134-142`) already exists
      and is applied to the AGENTS block eight lines below. ADR-0009:17 makes
      roster atomicity a stated constraint, so a half-removed roster is a real
      breakage, not a cosmetic one. **Recommendation: guard the skills removal
      with the same peer check, in this ticket** — it is four lines, in the
      function being changed anyway, and shipping a smarter delete while leaving
      an unguarded one next to it is worse than either alone.

- [ ] **How is the marketplace prune behaviour recorded, given it could not be
      run?** The ticket asks for the command and its output. Kanmer's marketplace
      is not registered on this machine (`~/.claude/plugins/known_marketplaces.json`
      lists only `claude-plugins-official`), and registering it is a mutation —
      out of scope for research, and blocked anyway by the manifest-path defect
      MCP-009/MCP-011 own. What *was* checked read-only is the on-disk layout:
      both hosts key the extracted tree by version. **Recommendation: record
      the layout evidence and the caveat, and name the live install as
      unchecked** — the ticket's own verification item allows "or named as
      unchecked", and asserting more than was run is the failure ADR-0009 exists
      to prevent.

## Parked (explicitly deferred)

- [ ] **Should the fix reach `.claude/skills/` too?** ADR-0009:9 records that
      opencode reads Claude-compatible `.claude/skills/`, so stale content there
      is live — but no provider spec installs to it, and this repo's copy is the
      operator's hand-made mirror. Safe to defer: Kanmer cannot own a directory
      it never wrote, and the roster stamp would be absent there by definition.
      Reopens if a provider is ever given `.claude/skills` as a `skillsDir`, or
      if CORE-023's detection decides to report on it.

- [ ] **Should reconciliation run automatically rather than on a button?**
      FRD-013 R1 says "every run, setup detects state and reconciles", which
      hints at a scheduled or on-open reconcile rather than a Connect-triggered
      one. Safe to defer: this ticket makes the existing entry points correct,
      which is a precondition either way. Reopens when kanmer-setup's v3
      reconciliation work lands.
