# Research — CORE-050

## Finding

Independent CORE-049 review confirms raw transient rename retry is bounded but does not repeat stale-inode/owner-marker validation after backoff. It also records three unresolved CORE-046 security threads: active replacement claimant overlap, broad cleanup-error suppression, and unvalidated persisted tokens used in marker paths.

## Scope and reuse

Extend the existing lock recovery protocol in `packages/core/src/io.ts` and its tests. Keep one authoritative token parser/marker-path validator, preserve CORE-047 token leases and CORE-049 bounded retry, and surface cleanup errors through the existing error path. Regenerate the standalone plugin artifact if source changes.

## Evidence and limits

Current rails: IO19/19, focused core110/110, source14/14, plugin parity and isolated readiness7/7 pass; broad HTTP remains 81/82 due unchanged readiness timing and live Windows/crash/PID evidence is INCONCLUSIVE. New tests must cover transient-then-replacement, active claimant, cleanup errors, and malformed/path-traversal tokens.

## Questions

No unresolved implementation question; exact transient set and bounded retries come from the existing helper and governing FRD/ADR.
