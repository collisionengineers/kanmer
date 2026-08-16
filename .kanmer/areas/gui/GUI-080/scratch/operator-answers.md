## OPERATOR ANSWERS — 2026-08-16

**Q1 + Q2 answered together: ship the ROSTER, the TOMBSTONE list, AND wholesale
replacement of owned folders.** The operator chose the fullest option.

What that settles:

- **Repair existing installs, do not merely stop the bleeding.** The two residues
  that prompted this ticket get cleaned on every machine:
  - `kanmer-import/` (folder, retired by `130f837`)
  - `kanmer-research/assets/impact-template.md` (renamed to `files-template.md`
    by the same commit)
- **The tombstone list is CLOSED at those two entries.** It is a repair for what
  retired before the roster existed — not a growing registry. Say so in the code
  and in the ADR/FRD prose: once the roster ships, future retirements are handled
  by the roster and nothing is ever added to the tombstone list. A tombstone list
  that grows is a second source of truth.
- **Owned skill folders are replaced wholesale**, not merged. This is what fixes
  the renamed template — folder-level pruning alone would leave it behind.
- **The cost is accepted and must be REPORTED, not silent:** a local edit inside a
  Kanmer-owned skill folder is discarded on install. Surface that in the Connect
  output — say which folders were replaced. A user who customised
  `kanmer-execute/SKILL.md` in place needs to learn that from Kanmer, not from
  losing it.
- **Foreign skills are never touched.** `.claude/skills/` and `.agents/skills/`
  hold user-written skills beside Kanmer's. The existing contract at
  `connect.test.ts:14-33` ("never touch a foreign skill") is the invariant this
  ticket must not weaken while gaining the power to delete. The roster is what
  makes deletion safe; prefix-matching on `kanmer-*` was rejected precisely
  because it would delete a user's own `kanmer-mine`.

**Stamp format:** version on line 1, roster below. `skillsStatus:203` `.trim()`s the
whole file as the version, so a JSON stamp would feed older Kanmer garbage.

**Also fix `removeBundledSkillsOnly` and `updateSkills`.** All three sites share
one defect. `removeBundledSkillsOnly` enumerates *currently bundled* names, so a
retired skill survives disconnect too; `updateSkills` is a one-line wrapper around
`installSkills` and reproduces the bug rather than fixing it. Its own doc comment
encodes the error — it equates "owns" with "currently ships". Rewrite the comment.

**Q3 answered by the orchestrator, not the operator: do NOT bump `plugin.json`
off `0.1.0` in this ticket. MCP-011 already owns that** — the approved plan gives
MCP-011 "bump both `plugin.json` versions to the repo version and add a rail check
that they cannot drift again". Two tickets bumping the same file is a conflict.

**But state the consequence plainly in GUI-080's `proof`:** while `plugin.json`
sits at `0.1.0`, `bundledSkillsVersion()` can never report an update, so
`Settings.tsx:417-437` never renders the "Update skills" button — the affordance
this ticket repairs stays **unreachable** until MCP-011 lands. Proof that claims
the button works without saying that would be false. Name MCP-011 as the ticket
that makes it reachable.

**Verification cannot use `.claude/skills/`.** Research established that directory
was never written by `installSkills` — `claude` and `codex` are `marketplace`
providers, and there is no `.kanmer-skills-version` file in it at all. It is the
operator's hand-made mirror. Build a real `copySkills` destination instead
(`.agents/skills` serves opencode AND antigravity; `.grok/skills`), seed it with a
retired skill, and assert the install prunes it.

**Related, do not fold in:** `disconnectAgent:307-311` removes `.agents/skills`
unconditionally even when the peer host is still connected, while
`hasRegisteredCopySkillsPeer` already guards the AGENTS block eight lines below.
ADR-0009:17 makes roster atomicity a stated constraint. If this is a one-line fix
in a function you are already rewriting, take it and say so in the report;
if it is bigger, file it.

**Lane B: GUI-080 runs FIRST.** GUI-079 shares `connect.ts` and `providers.ts` with
it and is still blocked on three operator questions. GUI-079 rebases onto this.
