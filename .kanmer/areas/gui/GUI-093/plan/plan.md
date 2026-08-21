# Plan — GUI-093: A publish failure aborts the release before asset verification can repair it

## Approach

Refactor the post-package release decision into a dependency-injected, dependency-free helper. release.mjs will run exactly one Electron Builder package after the tag is public, retain any non-zero publisher error instead of immediately throwing, run the local package rails and remote release verification, then decide from the verified assets. A complete remote release converts an already-exists publisher error into a successful release. An incomplete release receives one gh release upload --clobber repair of the exact files made by the single package, followed by one remote re-verification. The helper never invokes Electron Builder, so GUI-092's manifest/installer coherence invariant remains intact.

## Governing docs

- **FRD-021 Auto-update — meets.** The release rail proves the visible latest release and complete, byte-identical installer/blockmap/manifest set even in the failure mode that previously skipped proof. The repair is bounded, uses the already-built artifacts, and refuses with manual guidance on an unresolved problem; no updater runtime contract changes.
- **FRD-021 as-built record — corrected.** The GUI-066 amendment formerly described a second Electron Builder re-publish. It now accurately records the GUI-092/GUI-093 one-package exact-file repair; R3 itself is unchanged.

## Steps

1. Rebase the GUI-093 branch on the merged current main that contains GUI-092's one-package release workflow; preserve its tag ordering, local package checker, and local manifest-coherence check.
2. Add a dependency-free publication/recovery helper whose inputs are the publisher outcome, exact expected local assets, a remote verifier, and an exact-upload operation. It returns success only when remote verification succeeds, retries upload/re-verification at most once for an incomplete release, and never packages.
3. Build explicit GitHub upload arguments from expected asset local paths and GitHub-safe names, preserving the tested space-to-dash mapping and using clobber semantics.
4. Integrate the helper into release.mjs: catch the sole publisher error; still run the local rails when usable; verify latest visibility and all remote assets; upload/re-verify only where required; preserve a failed publisher error only when remote evidence cannot establish a complete release.
5. Add deterministic node:test coverage for publisher success, complete-after-422 acceptance, partial-release repair/recheck, failed repair refusal, one-attempt bound, exact upload names, and no Electron Builder invocation in recovery.
6. Update dry-run, comments, refusal diagnostics, and the stale FRD-021 as-built recovery record to describe one package plus exact-file recovery.
7. Run script tests, relevant release dry-run/no-network checks, root typecheck, focused build/package analogue when practical, and diff check. Do not create a tag, release, or production upload.

## Verification

- npm run test:scripts proves the helper's complete, partial, repair-failure, and no-second-package branches.
- npm run typecheck and the relevant build/check rails pass.
- release.mjs --dry-run continues to describe exactly one Electron Builder package and the new verification/recovery decision.
- A safe no-network probe must fail before release mutation when credentials are absent; no real release is cut.
- On merged main, record exact command results in proof.md. GUI-068 remains the only ticket for installed-client next-release acceptance.

## Risks / open questions

- **Shared release control flow:** GUI-093 rebased on GUI-092 merge e5070de and retains its one-package code; future changes must preserve that invariant.
- **Publisher error before local artifacts exist:** local/package or expected-asset derivation failure remains a loud refusal because exact-file recovery has nothing safe to upload.
- **Remote API or gh failure:** distinguish a failed check/repair from a known incomplete release and refuse with the existing manual remediation guidance.
- No user-only open question remains.
