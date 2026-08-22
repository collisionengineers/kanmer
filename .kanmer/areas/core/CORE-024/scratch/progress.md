### Rebase and fresh verification — 2026-08-22

- Rebased the CORE-024 branch by merging origin/main b6c8eb02 (GUI-106 recovery/main update) into the original implementation b041e944; merge commit is 9e7ab6299314cb3a7a9b0eb66ea70af630bf5b2c.
- The post-merge diff against origin/main remains exactly the eight CORE-024 files (484 added lines); no GUI-106/MCP-028 source is part of the ticket diff.
- Local PASS: focused merge-gate 10/10; CLI 1/1; core 279/279; all-workspace typecheck; build:core; build:server; GUI 39 files/362 tests; scripts 83/83; manual freshness; stdio 224/224; headless; protocol 46/46; discovery 13/13; skills; AGENTS block; diff-check; focused HTTP 5/5 and readiness 7/7.
- Preserved local failures: first npm run verify exited 1 in npm test at HTTP project-resolution spawnSync node.exe ETIMEDOUT; a broad npm run test:http -w @kanmer/mcp-server retry exited 1 with 61/63 (the same ETIMEDOUT plus readiness TUNNEL_READINESS_TIMEOUT), while both focused retries passed. With the temporary verifier-local mcpb package junction, npm run mcpb:check exited 1 at scripts/check-mcpb-sync.mjs:44 because the distributed plugin copy differs; npm run plugin:check exited 1 for the same committed-plugin parity drift.
- Hosted kanmer-gate PASS: run 32555645841 / Windows job 96989232191, PR #155 head 9e7ab6299314cb3a7a9b0eb66ea70af630bf5b2c, exit 0. Hosted verify FAIL: run 32555645841 / Windows job 96989232096, exit 1 at scripts/check-mcpb-sync.mjs:44 with MCPB server differs from distributed plugin copy; all preceding hosted suites/builds/package validation passed.
- The hosted gate JSON and full verify failure are external evidence for this head; no overall hosted verify PASS is claimed. No merge or cleanup is performed; independent Review remains required.

### Review amendment — 2026-08-22

- Independent review identified two contract mismatches in the CLI: gate annotations used the wrong title and infrastructure JSON omitted its discriminator.
- Commit 34044bccb7861dc81c16add91386b43570fda11c fixes both without changing evaluator behavior: errors now emit ::error title=kanmer/gate [<CODE>]::<escaped message>, and exit-2 JSON includes infrastructureError:true. Tests assert the exact OPEN_QUESTIONS annotation and discriminator.
- Amendment rails: CLI 1/1, focused merge-gate 10/10, core 279/279, all-workspace typecheck, build:core, build:server, syntax, and diff-check all exit 0. The prior merged-head broad HTTP timeout and MCPB/plugin parity failures remain preserved above.
- Pushed PR #155 head 34044bccb7861dc81c16add91386b43570fda11c. Hosted run 32556078470 was in progress at this readback (verify job 96990290597; kanmer-gate job 96990290443); no hosted PASS is claimed yet.
- Ticket remains Review for fresh independent review; no merge or cleanup.

### Final hosted verification — 2026-08-22

- Run 32556078470 completed at amended PR #155 head 34044bccb7861dc81c16add91386b43570fda11c: kanmer-gate job 96990290443 PASS; verify job 96990290597 FAIL/exit 1.
- Hosted verify passed npm test (core 279/279, GUI 39 files/362 tests, scripts 83/83), typecheck/builds, stdio 224/224, protocol 46/46, discovery 13/13, skills and AGENTS checks, then failed only at scripts/check-mcpb-sync.mjs:44 because the freshly built MCPB server differs from the distributed plugin copy. No hosted verify PASS is claimed.
