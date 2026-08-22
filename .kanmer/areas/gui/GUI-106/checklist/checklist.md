# GUI-106 checklist

- [ ] Confirm the ticket packet, HZN-007/EPIC-011 context, linked items, governing docs, and resolved gates were read.
- [ ] Record the implementation branch and worktree with take_ticket before source changes.
- [ ] Keep the fixed launcher registration path, cwd discovery, probe, stdio, and exit contract unchanged.
- [ ] Add a complete external current-runtime preference with a safe legacy InstallDir fallback.
- [ ] Stage all required Electron runtime files and the standalone MCP bundle in a versioned external directory.
- [ ] Activate the stable current junction only after the staged payload is complete.
- [ ] Preserve the install-root payload needed by legacy registrations and rollback safety.
- [ ] Limit normal-uninstall cleanup to Kanmer-owned external runtime paths and preserve update-time skip behavior.
- [ ] Keep the existing live MCP session stop/warning gate intact.
- [ ] Update deterministic package and launcher rails for the external runtime and fallback markers.
- [ ] Update session parser comments/tests only as needed to describe legacy versus external runtime sessions.
- [ ] Update governing/release wording without changing provider serialization or unrelated GUI/MCP scope.
- [ ] Run focused tests and package/build/type/shared rails; record exact exits and preserve first failures.
- [ ] Record real packaged-update/live-session/junction/uninstall evidence as INCONCLUSIVE where unavailable.
- [ ] Write and read back the post-implementation report, scratch handoff, commit, and PR traceability.
- [ ] Re-read get_doc_gates and move Implementing to Review only; stop for independent review.
