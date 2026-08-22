# Research — CORE-057 DNS/request binding and bounded resolution

## Review finding

CORE-044 PR #165 is open at cumulative head 142af2f3b105b38b00d659019d1cfe99f3b50844, based on CORE-026 head b5ae6f36. Its public-destination preflight resolves a hostname and rejects private results, but native fetch performs a separate DNS lookup, so rebinding can make the transport connect to an address different from the validated result. The same fetch helper starts its timeout before fetch but awaits DNS resolution without a shared deadline, so a slow resolver can exceed the documented request timeout.

## Governing contract

FRD-027 requires HTTPS, same-origin redirects, bounded request timeouts, public-destination checks, and deterministic tests. ADR-0020 makes declarations preferences rather than authority and requires remote fetch boundaries to fail closed. This remediation adds no source capability, GUI editor, provider migration, or general crawler.

## Smallest safe design

- Reuse the existing fetchText/assertPublicDestination seams and injected lookup/fetch fixtures.
- Bind the transport request to the addresses validated by preflight using the existing Node fetch/undici path or an equivalent governing-doc-backed local-only fallback. The implementation must not claim DNS validation if the actual connection can perform an independent unpinned lookup.
- Put one bounded deadline around both public-destination DNS resolution and the subsequent request/redirect body read. Resolver timeout and transport timeout must share the documented request budget and surface a stable timeout error.
- Preserve every existing redirect, public-destination, aggregate-byte, validator, cache, and diagnostic boundary; do not widen scope to the other CORE-044 findings.

## Evidence limits

Deterministic injected DNS and fetch fixtures can prove address binding and timeout behavior. No live DNS rebinding, private-network reachability, or packaged/remote host proof is available; those boundaries remain INCONCLUSIVE.
