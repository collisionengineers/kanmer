# Verification proof

- Scope: create one shared `VERIFY_STEPS` rail for the root `npm run verify` command and release gate.
- PR #120 merged to `main` at `d58bb781`; independent review passed.
- Standalone clean-checkout `npm run verify`: PASS — build; core 256, GUI 318, HTTP 61, scripts 66; typecheck all workspaces; smoke 184/184; protocol 42/42; discovery 13/13; verify skills; verify agents-block 31/31; plugin check; clean status.
- Merged-main `npm run verify` after subsequent MCP-034/MCP-040 merges: PASS — core 256, GUI 337, HTTP 61, scripts 66; build, typecheck, smoke, protocol, discovery, skills, agents-block, and plugin checks all passed.
- The reviewer-requested order is build → test → typecheck; the plan and open questions were updated accordingly.
- No assertions were weakened, no release semantics were broadened, and no secrets are present.
