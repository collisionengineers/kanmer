# Post-implementation report — CORE-100

## Summary

CORE-100 makes the future Windows updater artifact contract deterministic without changing the release verifier’s acceptance logic. Electron Builder now emits the already-safe `Kanmer-Setup-<version>.exe` name explicitly; the strict verifier remains unchanged and a regression preserves every observed v0.3.6 failure rather than treating dotted aliases as valid. The public v0.3.6 tag, release, assets, workflow result, and historical evidence were only read; no publisher, repair, tag, upload, or release operation occurred.

## Changes

| File | Change | Why |
|---|---|---|
| `apps/gui/electron-builder.yml` | Added `artifactName: "${productName}-Setup-${version}.${ext}"`. | Gives local NSIS output, `latest.yml`, GitHub upload, and the verifier one explicit safe name instead of relying on implicit rename behavior. |
| `scripts/verify-release-assets.test.mjs` | Added a configuration contract and a v0.3.6 tag-workflow/public fixture. | Prevents removal of the explicit artifact name and asserts all four historical strict failures: missing installer, blockmap size mismatch, blockmap digest mismatch, and `latest.yml` digest mismatch; dotted assets/MCPB remain informational extras only. |
| `AGENTS.md` outside the managed block | Documented the explicit public Windows installer-name and manifest/upload contract. | Keeps the contributor release convention accurate, as required for a changed command/convention boundary. |

Commits:

- `7e0683be876ff1e3921a999fc3d6f0257d937e43` — explicit name, documentation, and initial regression.
- `fb501a0487dc4314e432054c7ef01336b5d67f25` — complete historical v0.3.6 strict-failure regression.

## Governing docs

- **FRD-021 auto-update — met forward-only.** The generated local package has `Kanmer-Setup-0.3.6.exe`, a matching blockmap, and `latest.yml` URL/path under the exact same name. `node scripts/check-updater-package.mjs` passed all eight checks.
- **HZN-007 / AGENTS rules 19–20 — met.** The verifier code was not weakened; the test retains the exact historical FAIL evidence and all command exits, including prerequisite/invocation-context failures, are recorded in `scratch/execute.md`.
- **AGENTS rule 24 — met.** The human-owned release guidance was updated; the Kanmer-managed block was not edited.

## Risks / follow-ups

- v0.3.6 remains an immutable failed public release. Its tag workflow reached the bounded tenth attempt and preserved four errors: absent `Kanmer-Setup-0.3.6.exe`; blockmap size `83041` versus local `83074`; blockmap SHA-256 `9fc4…` versus local `83f9…`; and `latest.yml` SHA-256 `00ca…` versus local `3c37…`. It was not repaired, retagged, or reclassified.
- A local no-publish rebuild cannot byte-compare to that historical release. The read-only current source recheck exited 1 as expected and recorded the missing installer plus byte differences against its newly generated package. This is evidence preservation, not a reason to relax checks.
- A future successor release remains separate, reviewed, and governed; CORE-100 must not publish it. [[CORE-099]] stays blocked pending independent review/merge/proof of this source fix and a separately authorized successor-release decision.

## Verification hand-off

Completed before PR:

- `npm --prefix <worktree> ci --ignore-scripts` — exit 0.
- `node --test scripts/verify-release-assets.test.mjs` — exit 0, 46 passing.
- `node --test scripts/check-updater-package.test.mjs` — exit 0, 4 passing.
- `npm run build` — exit 0.
- `npm run test:scripts` — first exit 1 because a clean worktree lacked `packages/core/dist`; after the recorded isolated build, one corrective rerun exit 0, 102/102.
- `npm run verify:agents-block` — exit 0, 31/31.
- `npm run verify:docs` — exit 0.
- `npm run dist -w @kanmer/gui -- --publish never` — exit 0; emitted the hyphenated installer/blockmap and matching manifest. `node scripts/check-updater-package.mjs` — exit 0, 8 checks.
- Read-only `node scripts/verify-release-assets.mjs 0.3.6 --dir apps/gui/release` — exit 1 as expected; no remote mutation.
- Final fresh GitHub-origin normal clone at `fb501a0487dc4314e432054c7ef01336b5d67f25`: `npm ci --ignore-scripts` exit 0; `npm run verify` exit 0 (core 310/310, GUI 468/468, MCP HTTP 102/102, scripts 102/102, typecheck, docs, smokes, MCPB, skills, managed block, and plugin check).

After merge, `kanmer-verify` should run `npm run verify` on merged `main`, run the same explicit no-publish GUI package/update check, and retain a read-only v0.3.6 non-pass unless the separately governed successor-release work supplies new immutable public evidence. Do not write proof before merge.
