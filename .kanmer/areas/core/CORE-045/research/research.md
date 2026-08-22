# Research — CORE-045 lock recovery and public destination classification

## Question

What is the smallest safe remediation for the two independent CORE-044 review blockers without changing the source feature contract: a crash-created cache lock must not block forever, and DNS-resolved destinations must classify all known non-global IPv4/IPv6 ranges and mapped forms before fetch?

## Authoritative context and evidence

- CORE-045 is a Preparing fix linked to and blocking CORE-044. CORE-044 is Review at PR #165, commit 33f32e3aae9819f1c2344863272dacb5c958fbac, stacked on CORE-026 head b5ae6f36.
- CORE-044's review packet records F-003: withExclusiveFileLock writes only a PID and retries for about two seconds, so a crash-created lock is never recovered; F-009: the DNS classifier covers common RFC1918/link-local/multicast cases but misses non-global documentation/benchmark/reserved ranges and IPv4-mapped IPv6 equivalents.
- packages/core/src/io.ts is the shared cache/board persistence seam. withExclusiveFileLock claims a lock with writeFileExclusive, retries EEXIST, runs the callback, and removes the lock in finally. It has no stale-age, owner-liveness, or malformed-lock policy.
- packages/mcp-server/src/sources.ts calls the core lock for cache writes and performs literal plus DNS lookup checks before each root/redirect/linked request. isPrivateAddress currently covers common IPv4 ranges and selected IPv6 prefixes, but mapped hexadecimal IPv4 and several reserved/documentation/benchmark blocks are not classified.
- packages/mcp-server/src/sources.test.mjs already injects fetch and lookup functions, so deterministic policy tests can exercise every range without live network access. No new dependency is needed.
- FRD-027 requires bounded HTTPS/same-origin source retrieval and fail-closed remote exposure. ADR-0020 makes source declarations preference-only and requires remote destination/cache boundaries to fail closed.

## Chosen bounded behavior

- A lock is stale only after a conservative default age of 30 seconds and only when its recorded PID is demonstrably not alive. A live owner, an unreadable/malformed lock, or an uncertain liveness result is never removed; normal bounded retries then surface the original contention.
- Lock options expose an injected clock, stale threshold, liveness probe, and retry delays only as deterministic test seams; production defaults remain fixed and bounded. The lock record remains small and does not contain secrets.
- The destination classifier uses dependency-free numeric/range checks for known non-global IPv4/IPv6 special-use, documentation, benchmarking, reserved, multicast, unique-local, link-local, loopback, unspecified, and mapped IPv4 ranges. DNS lookup errors and empty answers fail closed. The check remains before every request and redirect.

## Evidence limits

Deterministic injected DNS and lock fixtures prove classification and recovery decisions. Live DNS rebinding between preflight and connect, platform-specific PID reuse, and process termination at the exact lock unlink remain INCONCLUSIVE and are explicitly parked; this ticket adds no external-service claim.
