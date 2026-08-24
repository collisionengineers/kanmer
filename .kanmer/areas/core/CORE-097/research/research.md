# Research — CORE-097

## Question

Why did the v0.3.4 tag verification fail, and what is the smallest safe remediation that preserves the release boundary?

## Evidence

1. GitHub Actions run [32764694871](https://github.com/collisionengineers/kanmer/actions/runs/32764694871) reached **Build and check the packaged updater** and failed during `npm run dist:check`. Electron Builder's GitHub publisher was created while handling the completed NSIS artifacts, then refused because `GH_TOKEN` was absent.
2. `.github/workflows/release.yml` currently invokes `npm run dist:check` on a `v*` tag with `permissions: contents: read`. It maps the ephemeral GitHub token only to the later asset-verifier step.
3. `apps/gui/electron-builder.yml` intentionally declares the GitHub updater feed. Electron Builder v26 treats the tag environment as publishable unless its CLI receives `--publish never`; merely supplying a token would schedule creation/upload of release assets.
4. The governing contract is explicit: `AGENTS.md` §11 and FRD-021 require this tag job to remain contents-read-only and never publish or repair a release. `scripts/release.mjs` is the sole publisher and calls Electron Builder with `--publish always` only in its post-merge publish phase.
5. There is no GitHub release for `v0.3.4`, and the failed tag run remains historical evidence. This ticket must neither retag nor replay publication.

## Decision

Preserve the read-only release-verification contract. Do **not** add a repository secret, personal token, `GH_TOKEN` mapping, or write permission. The workflow will execute the packaged-updater build with `--publish never`, then run the existing package checker, so it proves the artifact without creating an upload task.

## Rejected alternatives

- **Map `github.token` and grant write permission:** would allow Electron Builder to create/upload a release from CI, contradicting the sole-local-publisher contract.
- **Map a read-only secret/token:** Electron Builder still schedules upload work on the tag and fails when GitHub rejects a write.
- **Change the GUI publisher configuration or local release script:** outside CORE-097 and unnecessary for a verification-only job.

## Open questions

None. The release-boundary owner confirmed the read-only remediation above.
