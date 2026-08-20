# Open questions — GUI-102

All final integration decisions are resolved.

- [x] **Can this run begin before GUI-099/100/101 are merged and independently proven?** — No. Verify all three prerequisite SHAs/reports first; otherwise stop as blocked.
- [x] **What environment is authoritative?** — A disposable or fully snapshotted Windows user/VM starting with no Kanmer launcher/registry/project registration. Record exact OS, username class, paths and package hashes.
- [x] **What constitutes a real registration test?** — Normal GUI Connect writes the project entry, then a fresh Codex host invokes Kanmer `get_status`; `codex mcp list` alone is insufficient.
- [x] **What constitutes update survival?** — The project config hash remains unchanged, a real updater/NSIS transition handles a live MCP session according to policy, and a fresh host afterward reaches the new server build with the same project identity.
- [x] **Does the same process need to remain running?** — No. Updater safety may stop it. Continuity is the unchanged registration and successful fresh session after update.
- [x] **What must uninstall remove?** — Installer-owned app payload, fixed shim and matching HKCU `InstallDir`; it must preserve project config and unrelated sentinel files/registry values.
- [x] **What should happen after uninstall?** — Launch through the retained project registration fails clearly because the fixed shim/installation is absent. No stale/other install is silently selected.
- [x] **Is reinstall part of final acceptance?** — Yes. Reinstall restores launcher/registration operation without changing canonical project bytes.
- [x] **How are existing absolute registrations migrated?** — Update/install, reconnect each project once, inspect and commit the portable project entry as repository policy permits, restart Codex. Do not auto-edit Git or unrelated entries.
- [x] **What if an integrated defect appears?** — Stop, classify it by owner (GUI-099 launcher, GUI-100 registration, GUI-101 package/update rail), create/link a blocking fix or return the prerequisite PR to implementation. Do not patch broad scope inside the evidence ticket without explicit rescope.
- [x] **What result vocabulary applies?** — PASS, FAIL or INCONCLUSIVE; retain every failed attempt and never turn an unexecuted step into PASS.
- [x] **When is the epic done?** — Only after the single clean lifecycle, deterministic rails, docs disposition and cleanup all pass and proof is bound to the merged prerequisite SHAs/environment.

## Parked (explicitly deferred)

- [ ] **Production code signing/notarization** — outside this epic's portability contract; reopen in signing/release work.
- [ ] **Non-Windows hosts** — reopen when supported installers exist.
- [ ] **Automatic migration/commit of consumer repositories** — deliberately excluded; user owns repository changes.
