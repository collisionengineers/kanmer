# Post-implementation report — GUI-092

## Summary

The release rail now creates one NSIS package per release: after the tag is pushed, a single `electron-builder --win --publish always` invocation creates the installer, blockmap, and `latest.yml` together. The rail then checks packaged updater contents, asserts that the local manifest describes that exact installer, and retains the GitHub digest verification. It never creates a second package during an incomplete-release recovery path.

## Changes

| File | Change | Why |
|---|---|---|
| `scripts/release.mjs` | Removed the first Windows package invocation; kept source build before commit, runs the sole publishing package after the tag, then runs package/coherence rails. Remote failure does one re-check without re-packaging. | NSIS bytes vary between package invocations, so the old two-package flow could upload an installer different from the one described by `latest.yml`. |
| `scripts/verify-release-assets.mjs` | Added `verifyLocalArtifacts()`, which applies the existing manifest-to-installer rules to the local artifact set and rejects absent/wrong-version manifests. | Gives the release script deterministic evidence that the only local package is internally coherent before remote verification. |
| `scripts/verify-release-assets.test.mjs` | Added valid, SHA-512-mismatch, and wrong-manifest-version coverage for local coherence. | Locks the regression predicate into the dependency-free script test rail. |

## Governing docs

- **FRD-021 Auto-update (R3) — meets.** The release discipline still validates the packaged updater and every remote asset. It now also prevents a second NSIS package from invalidating the local manifest/installer pairing.
- No governing document was changed. The ticket retains its linked FRD and links [[GUI-068]] for the real next-release installed-client acceptance.

## Risks / follow-ups

- Electron Builder 26.15.3's advertised `publish --files` command rejects this repository's valid GitHub publisher configuration even with `--policy never`; the plan records the no-network probe. The design therefore favors one publish-capable package over a broken explicit-artifact publisher.
- Package-layout validation occurs immediately after the public package rather than before it. If it fails, the script refuses and the operator must remediate the visible release deliberately; it must not publish another non-reproducible installer.
- The actual prior-version auto-update install is external evidence for [[GUI-068]] at the next authorized release. No release was cut for this ticket.

## Verification hand-off

Run on merged `main`:

- `npm run test:scripts` — all dependency-free script suites pass (59 tests in this worktree).
- `npm run typecheck` — all workspaces pass.
- `npm run build -w @kanmer/gui`, then `npx electron-builder --win --publish never` from `apps/gui`, then `node scripts/check-updater-package.mjs` — no-network package analogue passes its 7 checks. Do not run `--publish always` during verification.
- `git diff --check` — clean.

A real `release.mjs <next-version>` run must additionally prove the local manifest/installer pairing and remote asset digest integrity; [[GUI-068]] owns the installed-client acceptance.
