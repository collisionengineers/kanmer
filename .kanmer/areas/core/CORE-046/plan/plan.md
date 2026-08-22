# CORE-046 plan

## Governing docs

- 'docs/functional/frd/FRD-027-project-declared-sources.md': preserve bounded HTTPS, same-origin, cache serialization, and fail-closed destination safety. The IPv6 additions tighten destination rejection only.
- 'docs/architecture/adr/ADR-0020-project-declared-source-trust.md': preserve the preference-not-authority boundary. No new source capability, dependency, or host authority is introduced.

## Base and scope

Stack on CORE-045 head '1234264b292e574d38f276b91592ea0b8bef9361' in '.worktrees/core-046', branch 'core-046-lock-reclaim-race-ipv6'. Implement only F-003 stale-lock reclaim ownership and F-009 IPv6 classification; leave CORE-044/CORE-045 and unrelated GUI/provider work untouched.

## Ordered steps

1. Replace stale-lock path unlinking in 'packages/core/src/io.ts' with a unique same-directory quarantine path and one atomic 'fs.rename' of the stale lock path. Remove only the quarantine inode owned by the successful reclaimer; treat rename races and uncertain errors as no-recovery, preserving bounded retries and callback cleanup.
2. Add a deterministic concurrent-reclaimer test in 'packages/core/src/io.test.ts' that coordinates two stale-lock claimants and proves the loser cannot remove the winner's newly claimed lock. Keep every inherited rename, atomic-write, temp-file, and lock assertion unchanged.
3. Extend 'isPrivateAddress' in 'packages/mcp-server/src/sources.ts' for '64:ff9b:1::/48', '100:0:0:1::/64', and '5f00::/16', using parsed group masks and retaining mapped IPv4 and all existing special-use checks.
4. Add deterministic source fixtures for each new IPv6 range, including boundary/in-range representatives, and retain the existing mapped/special-use/public fixtures.
5. Run focused core/source tests, then typecheck, builds, MCP HTTP/protocol/discovery/smoke and script/plugin/docs/agent rails as applicable. Regenerate the standalone plugin artifact if the server build changes it.
6. Write the post-implementation report with exact exit codes, record commit/PR traceability, append the Review handoff, and move only Implementing→Review after a fresh 'get_doc_gates' pass.

## Proof plan

The IO focused suite proves the atomic quarantine race and inherited assertions; the source suite proves all new IPv6 prefixes fail before fetch and existing public/mapped behavior remains stable. Full rails prove type/build/artifact synchronization. Merged-main proof and any live DNS rebinding, PID reuse, or exact crash timing remain for independent verification and are not claimed here.

## Risks and mitigations

- Filesystem rename behavior varies by platform: use a same-directory unique quarantine name, preserve errors, and make the deterministic test assert the losing reclaimer never touches the winner's path.
- IPv6 textual forms are easy to misclassify: route all addresses through the existing eight-group parser and test compressed forms and exact prefix boundaries.
- Artifact drift can hide source changes: run plugin build/check and record whether the committed bundle changed.

## Review-scope extension

The implementation checklist also covers the newly reported non-global IPv4 range 192.175.48.0/24 and a deterministic test that the existing lookup seam is invoked for each redirect and linked request. This remains within F-009 destination-policy hardening.
