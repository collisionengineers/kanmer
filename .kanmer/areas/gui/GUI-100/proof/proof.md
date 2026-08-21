# Proof — GUI-100

## Merged artifact

- PR #126 merged on 2026-08-21 at merge commit 3403fd86622e8223fec3e1bb691eb2e0eb960482.
- Implementation commit 2b5915690139e67bbc21acab0ede00d8c2365966 is reachable from current main.
- Scope is limited to portable Codex Connect serialization/probe/migration; GUI-101 and GUI-102 own packaged and real-host follow-up proof.

## Verification on merged main

- Current main: 3403fd86622e8223fec3e1bb691eb2e0eb960482.
- npm test -w @kanmer/gui -- src/main/connect.test.ts src/main/providers.test.ts — exit 0, 2 files / 91 tests passed (providers 66, connect 25).
- The focused tests cover byte-identical rootless shim registrations, probe argv/options, failed-probe no-write behavior, legacy drain compatibility, and non-Codex Electron invocation preservation.
- Independent review PASS is recorded in scratch/review.md.

## Limitations and follow-up

- No real provider host, packaged update cycle, or cross-machine live registration is claimed here; those are explicitly downstream GUI-101/GUI-102 acceptance scope.
- No deployment required for this source/config contract.
