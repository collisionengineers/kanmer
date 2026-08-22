# GUI-113 open questions

## Resolved

- [x] Which project owns registration files? The provider's declared `register` spec and `registrationState` are authoritative; no hardcoded cross-provider file inference.
- [x] How can native descriptors be updated without mutating the shipped bundle? Use a disposable staged copy for the install command and preserve the source descriptor byte-for-byte.
- [x] What happens when no registration is present or a context is refused? Skip with no write; preserve refusal status. Reconciliation failures are surfaced.

## Parked (explicitly deferred)

- [x] Hosted GitHub branch-protection and real Grok/Antigravity credential proof are unavailable to this lane; retain INCONCLUSIVE evidence for independent review/verification.
