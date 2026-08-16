# Open questions — GUI-073

**All resolved 2026-08-17, at plan time.** Two were settled by the operator after
the adjudication of the GUI-073/[[MCP-009]] conflict (see
`scratch/conflict-with-mcp-009.md`); two were decided in the plan; one was found
already fixed on main; one is parked with a reason.

## Resolved

- [x] **`agy -p` works now (research F2) — does `dispatch` flip to `true` in this ticket?**
      **No — option (a)/(c): this ticket stays a copy fix, and [[MCP-015]] carries the flip.**
      The refutation stands and is recorded: `agy -p` piped returns cleanly on
      1.1.13, ten runs across two independent agents, so the "GH #318/#76 hangs
      when piped" justification is **refuted, not stale**, and the comment behind
      `dispatch: false` must be corrected rather than kept.
      But `dispatch` does **not** flip here. `dispatch.ts:115` spawns with
      `cwd: root` and no workspace binding, and the adjudication established that
      only a bound folder makes `agy` read `.agents/` — so a dispatched
      Antigravity agent would be blind to the MCP server Connect just registered
      and would still appear in the "Dispatch to agent →" menu. Shipping that is
      worse than the label. `dispatch: false` survives with the **true** reason
      attached and MCP-015 named.

- [x] **Does FRD-012 get amended here, or does [[MCP-009]] amend it?**
      **MCP-009 owns it, has shipped it (`c81063e`), and nothing remains for this
      ticket.** Re-read against merged main at plan time: R2's Antigravity bullet
      now states both files are read **only in a workspace-bound session**, that
      Kanmer establishes no binding, that the write is therefore correct and
      inert, and names MCP-015 as owner; AC2 is restricted to a bound session,
      forbids the tool-list grep, and states it cannot pass until MCP-015 lands;
      R4 and R5 were rewritten in the same commit. R1 names
      `.agents/mcp_config.json` and R2 carries the condition, which answers the
      research's "R1 is incomplete" note. **No FRD-012 edit in this ticket** —
      recorded in the plan's Governing-docs section. ADR-0009 likewise: MCP-009
      amended the method clause and the convergence note; this ticket cites and
      does not re-amend.

- [x] **`plugins/kanmer/skills/kanmer-report/SKILL.md` fails Antigravity's YAML parser — new ticket, or absorbed?**
      **Neither — already fixed on main; no ticket needed.** Commit `fc2045b`
      ("fix(skills): quote-free frontmatter for kanmer-report + strict-YAML rail
      check", #42) removed the unquoted `": "` and added a rail check. Verified on
      `origin/main` at plan time: the description now reads
      `… a standup (now — in flight/blocked/up next) …`, and a scan of the
      frontmatter of all 13 `plugins/kanmer/skills/*/SKILL.md` files finds no
      remaining unquoted `": "` in a plain scalar. A board search for an existing
      ticket returned nothing, and none is warranted for a fixed defect.

- [x] **Should `listProviders()` expose capabilities instead of one boolean?**
      **Decided: no — not in this ticket.** The mislabel is fixed by naming what
      the boolean means ("no background dispatch") rather than by removing the
      renderer's need to interpret it. Widening the return type is a breaking
      change across the preload/IPC boundary for one real consumer
      (`Settings.tsx`) plus the `packages/ui` demo mock, and the per-host caveat
      that would justify a capability record already has a better home: the
      `codexTrustNote` pattern, which this ticket reuses for Antigravity's binding
      condition at connect time. When [[MCP-015]] flips `dispatch`, the badge
      disappears for Antigravity on its own. Revisit only if a second consumer or
      a second badge-worthy caveat appears.

## Parked (explicitly deferred)

- **What the Antigravity IDE does, as opposed to `agy`.** Still unverified, and
  now parked rather than left open: the adjudication covered the CLI only, and a
  GUI cannot be driven headlessly from these sessions. Handled by *not asserting
  it* — the connect-time note and the manual state the measured CLI condition and
  say the IDE was not tested. That is ADR-0009's method clause applied: an
  unchecked host is a finding, never a default. If someone opens the repo in the
  IDE and checks, it belongs on [[MCP-015]], which owns the binding.
- **Whether GH #318 / #76 are still open upstream.** Not fetched; the behaviour
  was tested against the installed binary instead, which is the stronger check.
  The corrected comment says both things.
- **Whether agy 1.0.x behaved as `providers.ts` described.** Only 1.1.13 is
  installed; irrelevant to what the UI should say today.
- **The other four providers' "cannot" claims** — [[MCP-009]]'s audit, shipped.
