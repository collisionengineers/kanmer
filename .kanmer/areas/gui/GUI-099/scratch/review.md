# Independent review — GUI-099

## Verdict

PASS — independent controller review completed against PR #124 and commits 0d8c3ecf5caad52fed282939a059af0feef74455 and dbbdf0fbacb541e2b4330d6fd0acabf0fa4088a1.

## Scope and contract

- ADR-0018, FRD-012 R1d, and ADR-0012 consumer constraints are implemented.
- The static launcher is fixed at LOCALAPPDATA/Kanmer/bin/kanmer-mcp.cmd, resolves HKCU Software/Kanmer InstallDir with system reg.exe, validates the packaged executable and MCP bundle, preserves cwd/stdout/stderr, and accepts only no arguments or --probe.
- NSIS customInstall validates payloads, atomically replaces the stable shim, and writes HKCU only after payload readiness. customUnInstall removes only state owned by the uninstalling installation.
- GUI-100/101/102 provider registration and host integration remain explicitly out of scope.

## Evidence

- npm test: PASS on the author lane; manual freshness, core 256/256, GUI 337/337, HTTP 61/61, scripts 75/75.
- npm run typecheck: PASS for all workspaces.
- npm run dist:check: PASS; Windows installer and updater-package checks 8/8.
- Focused installer launcher contract: 4/4; scripts rail: 75/75.
- Windows installer lifecycle, --probe, stdio/cwd/exit propagation, upgrade/repair ownership, obsolete-uninstaller safety, and state restoration were recorded by the implementation lane.
- Diff review: only launcher/NSIS/package/docs/release-note/check-updater/test files; no provider registration, .gitignore, remote transport, or GUI-100/101/102 changes.

## Findings

No blocking findings. Merge is authorized; post-merge verification must run on merged main and record proof before closeout.

## Independent controller second pass — 2026-08-21

The PR was merged by the author before this independent review record was written (PR #124 merge commit d9379d32ffa775ab1ef957dd58ac65acb6e29fca; head dbbdf0fbacb541e2b4330d6fd0acabf0fa4088a1). That ordering is recorded; the implementation itself was reviewed independently on merged main.

- PASS. The exact PR diff is limited to the launcher shim, NSIS lifecycle hook, packaging/updater rail, release note, ADR/FRD amendments, and the focused static test; no provider-registration, remote transport, .gitignore, or GUI-100/101/102 changes are present.
- Focused launcher contract test: exit 0, 4/4.
- Merged-main npm test: exit 0 — manual 22 chapters, core 256/256, GUI 338/338, HTTP 61/61, scripts 75/75. The report's retained transient concurrent core failure remains visible and was not erased.
- Merged-main npm run typecheck: exit 0 for core, MCP server, UI, and GUI.
- Merged-main npm run dist:check: exit 0; installer packaging completed and updater package checks were 8/8.
- Merged-main npm run check:manual, node scripts/check-doc-numbering.mjs, and git diff --check 802758af..d9379d32: exit 0.
- Reviewed the batch/NSIS contracts against ADR-0018, FRD-012, ADR-0012, the plan/files/research correction, checklist, and post-implementation report: fixed HKCU InstallDir resolution, payload validation, same-directory shim replacement, ownership-aware uninstall, inherited cwd/stdio, no arbitrary arguments, exact child exit propagation, and explicit GUI-100/101/102 boundary are all represented. No blocking finding.

Disposition: PASS; move Review → Verifying. Post-merge proof must retain the exact merge SHA and real merged-main checks before Done.
