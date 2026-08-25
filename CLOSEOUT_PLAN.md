# Kanmer workflow closeout plan

The purpose of these upgrades is to leave Kanmer as a reliable self-hosting workflow product: protected pull requests, trustworthy releases and updates, working local agent connections, two clearly separated remote-access paths, and ticket evidence that describes what actually shipped. The immediate goal is to recover from the immutable partial v0.3.8 release, publish one clean v0.3.9 successor, prove the installed application rather than only its source, restore both Cloudflare and OpenAI tunnel operation, and move every active deliverable to Done without rewriting failed history.

## 1. Authoritative current state

- The source baseline is merge `8c8fdb868aed3677b3603b9ba360f304139aee6f` on `origin/main`.
- v0.3.8 is a failed immutable release attempt. Its tag is correct, but the public release contains only the installer. The blockmap, `latest.yml`, and MCPB are absent.
- The v0.3.8 tag workflow passed source and independent package checks, then failed public verification. Its rebuilt signed NSIS installer had a different SHA-256 from the publisher build; cross-build signed-byte identity is not a valid invariant.
- Installed v0.3.7 reproduces the Codex probe failure shown by the user. GUI-132 already merged the real Windows invocation and pasteable-fallback fix; it needs a clean successor release, not a parallel launcher.
- GUI-133's coherent runtime-generation work and MCP-049's managed remote-runtime work are also merged after v0.3.7 and await installed release proof.
- Active closeout work is CORE-106, CORE-107, and the Verifying tickets CORE-036, CORE-042, CORE-103, and MCP-028.
- Preserve the dirty/divergent root checkout. Use ticket worktrees or a fresh clone from `origin/main`.
- Kanmer setup is current: format 3, managed instructions and installed skills current, no migration required. The compensated `questions-resolved` note is informational.

## 2. Non-negotiable rules

1. Start with `get_status`, `list_board`, and `list_items`; call `get_doc_gates` before every adjacent stage move.
2. Use one ticket, branch, and worktree per bounded change. Never merge the executing agent's own PR.
3. Write proof only after merge against the exact merge SHA. Preserve every failed attempt; a later pass does not erase it.
4. Never retag, overwrite, or repair v0.3.8. Publish a higher version.
5. Never expose credentials in source, ticket records, logs, screenshots, or proof.
6. Do not weaken tests, branch protection, asset requirements, authentication, or TLS.
7. Close out Done tickets that retain `taken_at`, branch, or worktree metadata.

## 3. Complete CORE-106 — release-system correction

Work CORE-106 through execute, independent review, merge, exact-merge verification, and closeout before v0.3.9.

1. Make Electron Builder a packager only: one `--publish never` generation produces installer, blockmap, and `latest.yml`.
2. Copy the matching MCPB into that retained release directory.
3. Run packaged-updater and local manifest/hash checks before any GitHub mutation.
4. Refuse if the target tag or GitHub Release already exists.
5. Push the immutable tag, explicitly create the GitHub Release, and upload exactly the four validated assets. Do not use Electron Builder's GitHub publisher or `--clobber`.
6. Keep publisher verification byte-identical to that one retained generation.
7. Add `--remote-coherent` verification for tag CI: require installer, blockmap, MCPB, and `latest.yml` exactly once and uploaded; require valid GitHub SHA-256 metadata; download the public manifest and installer; verify version, URL, size, and SHA-512.
8. Keep tag CI's independent `dist:check` as source/package health. Never compare its signed installer bytes with the publisher build.
9. Test missing, duplicate, non-uploaded, wrong-version, wrong-URL, wrong-size, wrong-SHA-512, and missing-digest cases.
10. Require exit 0 from `npm run test:scripts`, `npm run verify`, and `npm run release -- 0.3.9 --ticket CORE-107 --dry-run`.

Stop CORE-106 after reviewed merge, exact-merge proof, and cleanup. CORE-107 owns publication.

## 4. Prepare and publish CORE-107 — v0.3.9

1. Update v0.3.9 release notes to describe only merged behavior.
2. Research and plan CORE-107 with acceptance for publication, installed updater/reinstall, Codex Connect and fallback, packaged MCP identity, Cloudflare, and OpenAI managed runtime.
3. From a clean ticket worktree run:

```powershell
npm ci
npm run release -- 0.3.9 --ticket CORE-107 --dry-run
npm run release -- 0.3.9 --ticket CORE-107
```

4. Independently review and merge the release PR through protected `main`.
5. Update a clean publisher clone to the exact merge SHA and invoke the authorized publish phase once with the token injected only into that process.
6. Do not manually upload, retag, rerun packaging, or automatically create v0.3.10 on failure. Record and diagnose the terminal failure first.

Publication passes only when v0.3.9 points to the exact merge; the release is latest/non-draft; installer, blockmap, MCPB, and manifest exist exactly once; publisher digest verification exits 0; tag CI is green; remote coherence exits 0; `latest.yml` matches the public installer; and v0.3.8 is untouched.

## 5. Installed Windows acceptance

1. Start from installed v0.3.7 and preserve settings/project state.
2. Preserve the v0.3.7 Codex failure as negative evidence.
3. Confirm the updater detects v0.3.9; exercise live-session refusal/stop; install and restart.
4. Require the GUI executable, resources, external launcher generation, and `get_status.server.version` to report v0.3.9.
5. Confirm settings survived and the updater no longer offers v0.3.9.
6. Run Codex Connect successfully. Run its displayed fallback in PowerShell and `cmd.exe`; it must contain no backslash-escaped quotes and exit 0.
7. Restart Codex in the project and require `get_status`, `list_board`, and `list_items` with the expected fingerprint.
8. Smoke Claude Code, Grok, and Antigravity only within documented capabilities.

Any v0.3.9 installed failure becomes one narrow ticket before code changes.

## 6. Cloudflare acceptance

1. Use the GUI remote manager with the existing named tunnel, protected credential-file reference, `mcp.rivetandrelay.co.uk`, and loopback MCP origin.
2. Follow current official Cloudflare documentation for provider/API actions and never print credentials.
3. Run generation-bound `remoteView` then `remoteDoctor`; preserve only redacted results.
4. Require a healthy listener/connector, DNS/TLS route, unauthenticated and invalid-token 401s, authenticated initialize, expected fingerprint, a read tool, one disposable mutation/readback/archive cycle, clean close, restart recovery, and no secret leakage.
5. Remove erroneous DNS residue only after resolving its exact record and confirming it is not canonical. Keep catch-all 404; do not add a root-domain MCP record.

## 7. OpenAI Secure MCP Tunnel acceptance

1. Reuse the Infisical-managed project credential without printing it.
2. Use installed v0.3.9 and the existing tunnel/profile; do not embed the key in YAML or Git.
3. Doctor the canonical profile, connect/register its managed alias, and query runtime status.
4. Require `process_running`, `healthy`, and `ready` true and stale false.
5. Invoke `get_status` and one read tool remotely; confirm v0.3.9 and the expected fingerprint.
6. Retire any duplicate profile only after comparing non-secret configuration and proving the canonical runtime.

Cloudflare and OpenAI are separate transports; one passing never substitutes for the other.

## 8. Close inherited Verifying tickets

- CORE-103: finalize FAIL proof for v0.3.8, link CORE-106/107, archive it, release ownership, and safely clean its worktree/branch.
- CORE-036: use v0.3.8 as negative evidence and green v0.3.9 tag/public-coherence evidence as positive proof; PASS and close out.
- CORE-042: combine protected-main flow with installed v0.3.7→v0.3.9 evidence; PASS and close out.
- MCP-028: reconcile its checklist against actual Cloudflare/OpenAI matrices. Tick only executed cases; explicitly supersede obsolete variants; PASS and close out.

## 9. Final audit

1. Require zero active tickets outside Done; historical failed releases remain archived with explicit FAIL dispositions.
2. Require no stale ownership/worktrees, unexplained blockers, unresolved non-parked questions, or unreachable recorded commits.
3. From a clean clone run:

```powershell
npm ci
npm run verify
npm run dist:check
node scripts/verify-release-assets.mjs 0.3.9 --remote-coherent
```

4. Repeat installed board CRUD/live reload, Codex connection, Cloudflare doctor/public initialize, and OpenAI runtime status.
5. Run a tracked-source and ticket-document secret scan.
6. Produce a final Kanmer report covering tickets, archived failures, release evidence, installed updater, agents, both remote paths, and retained history.

Closeout is complete only when every active ticket is Done, v0.3.9 is complete and verified, the installed product and Codex connection work, both remote paths are healthy, and no credential or stale work ownership remains.
