# Checklist

- [x] Inspect the canonical `kanmer-docs` generator and compare its current output with `docs/contributing/doc-structure.md`.
- [x] Refresh `docs/contributing/doc-structure.md` through the supported generation path so it reflects the live format-3 model without hand-only edits.
- [x] Correct source-backed README Windows source/installed behavior and ticketed/protected release workflow guidance, preserving no-secret instructions.
- [x] Correct only source-backed stale FRD prose identified by the audit; record any intentionally retained legacy wording in the report.
- [x] Add or extend a deterministic dependency-free freshness check that fails on stale generated documentation/operator guidance and passes for current files.
- [x] Run focused documentation/freshness checks and inspect the diff for scope and traceability.
- [x] Write the post-implementation report with governing-doc mapping, risks, and merged-main verification commands.
- [x] Resolve independent review findings: target-neutral asset globs, fixed document-type wording, AGENTS verification documentation, FRD-019 keyboard caveat, and release artifact retention guidance; record GUI-126 as the source-code follow-up.
- [x] Resolve second-pass review findings: effective board-glob resolution, manifest presence-only fallback, consumer-safe mirror footer, and dry-run local artifact wording.

---

## Closeout — DOC-019

- [x] PR merge verified (PR #227 MERGED as ac0b19199cbb4d75ad9b7358adc3f46c971121be)
- [x] proof.md finalised (merged-main checks and hosted run recorded)
- [x] Moved to final stage (Verifying → Done)
- [x] Outcome recorded in ticket body (PR link; GUI-126 follow-up linked)
- [ ] cd out of worktree; remove recorded DOC-019 worktree
- [ ] Delete merged DOC-019 branch
- [ ] Fetch/prune worktrees
- [ ] take_ticket action: release
