# CORE-109 plan

## Purpose

Publish one clean v0.3.10 successor from current protected `main`, using the already-merged single-build publisher and numeric draft verification. Then prove the installed product and both remote transports so the remaining release-dependent tickets can close against one authoritative deployment.

## Implementation order

1. Fetch `origin/main` and create the recorded ticket worktree from its exact current SHA. Confirm v0.3.8 remains an incomplete public failure and v0.3.9 remains an unpublished draft; do not mutate either.
2. Inspect FRD-021, the current release script/tests, public asset-name contract, app release notes, and the exact changes merged after v0.3.9 (CORE-108 and SKILL-035). Make only release metadata/release-note changes required for v0.3.10.
3. Run the governed preparation dry run from the clean ticket worktree. Require the complete repository verification rail and package checks to exit 0.
4. Run release preparation for v0.3.10, producing the canonical release branch commit and protected-main PR without creating a tag or public release.
5. Obtain an independent exact-head review, resolve every finding, and require `verify` plus `kanmer-gate` to pass. Merge through protected main only after approval.
6. From a fresh clean checkout at the exact merge SHA, invoke publish mode once with the already-authorized release credential injected only into that process. Require one package generation, a repository-pinned draft, four canonical assets, numeric-id draft verification, immutable tag creation, and publication only after integrity checks pass.
7. Monitor the tag workflow to terminal success and run the strict public asset verifier against v0.3.10. Record asset names, sizes, digests, URLs, commands, and exit codes without recording credentials.
8. Exercise the installed Windows boundary: install/update or coherently reinstall to v0.3.10; launch; use Check for updates; verify GUI and packaged MCP versions; run the installed launcher probe in pasteable form; and exercise Codex Connect. Preserve settings and ensure the executable/resources are one version.
9. Validate Cloudflare and OpenAI separately. For Cloudflare, use the existing named-tunnel credential and `mcp.rivetandrelay.co.uk`; require a healthy connector, exact-host routing, authenticated MCP initialization, read/mutation/cleanup, and actionable recovery. For OpenAI, use the existing authorized tunnel id and Infisical-supplied runtime credential with the managed-runtime commands; require healthy/ready status and an MCP read. Do not print secrets.
10. Write PASS proof only if every release and installed-product acceptance criterion succeeds. Otherwise preserve the exact failure and use the terminal non-success path; do not create another successor automatically.
11. After PASS, move CORE-109 to Done and close it out. Reuse its positive evidence to reassess CORE-036, CORE-042, and MCP-028, but close each only against its own acceptance criteria.

## Commands and evidence

- `npm ci`
- `npm run release -- 0.3.10 --ticket CORE-109 --dry-run`
- `npm run release -- 0.3.10 --ticket CORE-109`
- after protected merge: `npm run release -- 0.3.10 --publish --release-commit <full-merge-sha>`
- `node scripts/verify-release-assets.mjs 0.3.10`
- installed `%LOCALAPPDATA%\Kanmer\bin\kanmer-mcp.cmd --probe` using the product's documented pasteable invocation
- provider-specific Cloudflare and OpenAI health/doctor commands selected from the shipped implementation and official client guidance

Record each cwd, exact invocation, exit code, and conclusion. A successful diagnostic does not erase any prior failed publication attempt.

## Stop condition

Stop after CORE-109 has either (a) exact-merge PASS proof covering public release, installed runtime, Codex Connect, Cloudflare, and OpenAI tunnel operation and has been closed out, or (b) a truthful terminal failure record identifying the exact failed acceptance criterion. Do not retag old releases, manually repair their assets, weaken checks, or invent another release ticket.
