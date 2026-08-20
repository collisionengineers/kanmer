# Open questions — GUI-101

All implementation-shaping questions are resolved. This ticket is evidence/rail work over the already approved launcher and registration contracts.

- [x] **What does `dist:check` need to prove?** — The packaged output contains the launcher source, NSIS lifecycle wiring and canonical MCP bundle at the exact paths expected by GUI-099; malformed/missing pieces fail the existing package rail.
- [x] **Can unpacked-output checks prove installer lifecycle?** — No. They prove package inputs only. HKCU/fixed-shim/update behavior requires a controlled real NSIS installation.
- [x] **What is the real-host success claim?** — An unchanged canonical project config calls `get_status` before and after an installed app update; the project identity stays correct and the packaged server identity advances to the new build.
- [x] **Does an already-running agent session need to survive in memory?** — No. Updater safety may intentionally stop it. Start a fresh Codex host after update and prove the same registration launches the new target.
- [x] **How many environments are needed?** — At least two different Windows user/install/source path combinations for byte/location portability, plus one controlled installed update sequence. These may be two disposable profiles on one machine if usernames and paths genuinely differ.
- [x] **How is user state protected?** — Prefer disposable VM/users/test feed. Otherwise snapshot exact installer/HKCU/shim/config state and restore it; do not run destructive lifecycle tests against an unrecorded production installation.
- [x] **When may `.codex/config.toml` become committable?** — Only after both locations use byte-identical config and successfully call the tool from packaged installs. Then remove only that ignore line and update the invariant/comment.
- [x] **What migration is required for existing users?** — Update/install the version containing the shim, reconnect each Codex project once to replace the old owned entry, review/commit the project file according to repository policy, and restart the agent host. No automatic Git operation.
- [x] **What if package/real proof exposes a GUI-099/100 defect?** — Record the deviation and return it to the owning ticket/PR unless the fix is an inseparable small regression required for this ticket's acceptance. Do not silently redesign either contract.
- [x] **What evidence is mandatory?** — Exact commits/versions, installer hashes, package rail output, config hashes, fixed shim/HKCU state, process/session evidence, before/after `get_status`, updater result and cleanup.
- [x] **Does this ticket complete the epic?** — No. GUI-102 owns the final fresh-install → register → update → live → uninstall end-to-end acceptance and migration walkthrough.

## Parked (explicitly deferred)

- [ ] **Code signing and production feed policy** — outside the portable launcher claim; reopen under release/signing work when credentials exist.
- [ ] **Non-Windows portability** — reopen only when supported non-Windows installers/hosts exist.
