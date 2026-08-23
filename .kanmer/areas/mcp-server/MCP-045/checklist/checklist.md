# Checklist — MCP-045

- [x] [pre-review] Take MCP-045 in its own worktree and confirm the current verifier/client, doctor, wrapper, and test contracts.
- [x] [pre-review] Implement a strict descriptor allowlist that permits `tokenFile` and `localEndpoint` references but rejects inline credential keys.
- [x] [pre-review] Thread the loopback local endpoint into the doctor fixture without changing public route checks.
- [x] [pre-review] Emit explicit client PASS/FAIL outcomes from the complete boundary-check set.
- [x] [pre-review] Preserve PASS/FAIL/INCONCLUSIVE mapping and exit codes in `verify-remote-public.mjs`.
- [x] [pre-review] Add regression coverage for safe file references, separate local/public endpoints, explicit outcome, and unsafe inline credentials.
- [ ] [pre-review] Run focused tests and the full build/plugin/verification rail without weakening assertions.
- [ ] [pre-review] Record the post-implementation report and open the PR for independent review.
- [ ] [post-merge] Verify the merged commit with the disposable public Cloudflare tunnel and record sanitized MCP-028 evidence.
- [ ] [post-merge] Confirm cleanup removes owned processes, files, board fixture, and provider resources.
- [ ] [pre-review] Stop at the reviewed/verified boundary; do not merge as author or start another ticket.

## Progress notes

- Focused remote integration tests passed (2/2).
- Build and plugin parity passed; full `npm run verify` retained an unrelated GUI timeout in `index.sync.test.ts`.
