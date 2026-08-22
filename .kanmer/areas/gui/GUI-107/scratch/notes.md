Research/files/open-questions written via MCP after complete packet and source review. Fresh gates pass for backlog → preparing; proceeding one boundary at a time.

Implementation complete on .worktrees/gui-107. Focused TicketCreate/Editor tests: exit 0, 21/21. Full GUI rail: npm run test -w @kanmer/gui exit 0, 39 files / 360 tests. GUI typecheck initially exited 1 because the new fixture omitted Item labels/links/archived; fixed fixture and reran npm run typecheck -w @kanmer/gui exit 0. Root npm run typecheck exit 0; GUI production build exit 0; git diff --check exit 0. Root npm test preserved failure: manual check passed (22 chapters), core reported 266/266 tests but Vitest exit 1 due one unhandled pre-existing Windows EPERM opening C:/Users/Alex/AppData/Local/Temp/kanmer-dispatch-QOSkQl/MCP-022-23b34299-66c7-4c5c-be9f-52ab805a3f6f.log in dispatch-supervisor.test.ts (surfaces terminal recording failures). Remaining root rails were not claimed PASS.

Additional root rails preserved: npm run test:http -w @kanmer/mcp-server built the server successfully, then exited 1 with 60/61 passing because src/http.test.mjs project resolution fails before binding hit spawnSync node ETIMEDOUT (2045ms) in the controlled Windows host. npm run test:scripts initially exited 1 with 80/82 passing: auto-run-state.test.mjs and release-notes.test.mjs could not import missing packages/core/dist/index.js in the fresh worktree. This is setup-state evidence, not a GUI-107 assertion failure; core build + rerun will be recorded separately.

After npm run build:core (exit 0), reran npm run test:scripts: exit 0, 82/82 pass. Initial fresh-worktree 80/82 missing-dist failure remains preserved above.

Reran npm run test:http -w @kanmer/mcp-server after the first transient ETIMEDOUT: exit 0, 61/61 pass. The initial 60/61 + spawnSync ETIMEDOUT remains preserved as a controlled-host transient failure.

Review-ready: commit b260b7336ead37a6d552572dafe35a8c8a0005e5 pushed as PR #151; post-implementation report read back. Fresh enter-review gates pass; moving exactly one boundary to Review and stopping for independent review.
