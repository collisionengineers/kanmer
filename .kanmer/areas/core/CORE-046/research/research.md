# CORE-046 research

## Question

How should the two independent CORE-045 review blockers be remediated without weakening the inherited lock, atomic-write, or destination-policy guarantees?

## Findings

1. **Stale-lock reclaim is still path-TOCTOU vulnerable.** On the CORE-045 base ('1234264b'), 'packages/core/src/io.ts' reads and stats a stale lock, checks the recorded owner, re-reads the path, and then calls 'fs.rm(lockFile)'. Two reclaimers can observe the same stale inode; one can remove and claim a new lock while the other still reaches 'rm(lockFile)', deleting the new claimant's lock. The current 'writeFileExclusive' claim is atomic, but the recovery path does not transfer ownership of the observed inode atomically. Source: 'packages/core/src/io.ts', 'recoverStaleLock', and the existing 'withExclusiveFileLock' tests.
2. **The safe ownership transition must be atomic and path-specific.** A unique same-directory quarantine name plus 'fs.rename(lockFile, quarantineFile)' transfers the exact inode currently at the lock path in one filesystem operation. Only the reclaimer whose rename succeeds owns the quarantined inode; a concurrent reclaimer receives 'ENOENT' and must not unlink or overwrite the path. The quarantine is removed only after the owner has transferred the stale inode, and any race/error is fail-closed. Source: Node filesystem rename semantics and the ticket's explicit F-003 acceptance requirement.
3. **The inherited IPv6 parser already normalizes compressed and dotted mapped forms.** 'packages/mcp-server/src/sources.ts' parses eight groups and maps '::ffff:' forms into the IPv4 classifier. The missing F-009 ranges are '64:ff9b:1::/48', '100:0:0:1::/64', and '5f00::/16'; they must be classified before network access while retaining all CORE-045 mapped/special-use checks. Source: 'parseIpv6Groups', 'isPrivateAddress', and 'packages/mcp-server/src/sources.test.mjs' on the exact CORE-045 base.
4. **The governing contract is unchanged.** FRD-027 requires bounded HTTPS same-origin retrieval and no private/local destination; ADR-0020 makes declarations preferences rather than authority. The remediation adds no new source capability, dependency, or trust surface. Sources: 'docs/functional/frd/FRD-027-project-declared-sources.md' and 'docs/architecture/adr/ADR-0020-project-declared-source-trust.md'.

## Implications

- Keep all existing 'io.test.ts' assertions and append a deterministic concurrent-reclaimer regression proving a newly claimed lock survives the losing reclaimer.
- Use an atomic quarantine/rename as the only stale-inode removal path; never unlink the original lock path after another claimant can recreate it.
- Add deterministic destination tests for every newly rejected IPv6 prefix and retain the inherited mapped IPv4 and special-use fixtures.
- Stack implementation on CORE-045 head '1234264b292e574d38f276b91592ea0b8bef9361' in '.worktrees/core-046' on branch 'core-046-lock-reclaim-race-ipv6'.

## Additional review scope

The current CORE-045 review also identified IPv4 192.175.48.0/24 as non-global and requested regression evidence that DNS classification runs before every redirect and linked-page request. CORE-046 therefore adds that IPv4 range and a deterministic redirect-plus-linked-hop lookup-count test; no broader resolver or network authority is introduced.
