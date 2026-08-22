# GUI-106 checklist

- [x] Confirm the ticket packet, HZN-007/EPIC-011 context, linked items, governing docs, and resolved gates were read.
- [x] Record the implementation branch and worktree with take_ticket before source changes.
- [x] Keep the fixed launcher registration path, cwd discovery, probe, stdio, and exit contract unchanged.
- [x] Add a complete external current-runtime preference with a safe legacy InstallDir fallback.
- [x] Stage all required Electron runtime files and the standalone MCP bundle in a versioned external directory.
- [x] Activate the stable current junction only after the staged payload is complete.
- [x] Preserve the install-root payload needed by legacy registrations and rollback safety.
- [x] Limit normal-uninstall cleanup to Kanmer-owned external runtime paths and preserve update-time skip behavior.
- [x] Keep the existing live MCP session stop/warning gate intact.
- [x] Update deterministic package and launcher rails for the external runtime and fallback markers.
- [x] Update session parser comments/tests only as needed to describe legacy versus external runtime sessions.
- [x] Update governing/release wording without changing provider serialization or unrelated GUI/MCP scope.
- [x] Run focused tests and package/build/type/shared rails; record exact exits and preserve first failures.
- [x] Record real packaged-update/live-session/junction/uninstall evidence as INCONCLUSIVE where unavailable.
- [x] Write and read back the post-implementation report, scratch handoff, commit, and PR traceability.
- [x] Re-read get_doc_gates and move Implementing to Review only; stop for independent review.
