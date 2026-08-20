# Review — PR #64 (needs changes)

## Blocking findings

1. **The diff materially exceeds the approved plan.** The plan limits the change to docs/manual/connect.md, README.md, and generated manual content, with the tunnel profile explicitly user-global and outside Git. The PR additionally adds .infisical.json, a project-specific Infisical workspace id, scripts/chatgpt-tunnel.ps1, package scripts, and an operational runbook. This is new credential-management/process behavior with no planned tests or governing decision.

2. **Repository documentation is coupled to one operator’s private infrastructure.** It records a concrete tunnel id, personal absolute paths, a private Infisical secret naming scheme, and an Infisical workspace. Those are not reusable product configuration and must not become a prerequisite for Kanmer users. Remove this operational state and keep the documentation generic/redacted.

3. **The new launcher is untested and its guarantees are stronger than the evidence.** The report records an absent control-plane key and cannot demonstrate the Infisical wrapper, secret injection, status endpoint, or portability behavior. The declared scripts should either be removed as out of scope or gain a separately planned, tested product integration; do not merge an untested secret-launcher into the repository.

4. **Current public OpenAI guidance is plan/workspace dependent.** The official developer-mode and MCP apps guidance (https://help.openai.com/en/articles/12584461-developer-mode-and-full-mcp-connectors-in-chatgpt) supports Secure MCP Tunnel for private/local servers but says developer-mode/full MCP availability and write behavior vary by plan/workspace and are beta. Rework the manual to state prerequisites generically and defer to official current controls instead of presenting the recorded operator path as universal.

## Required rework

Return to the stated documentation-only scope: remove .infisical.json, the launcher, npm tunnel commands, and personal tunnel/workspace/secret details. Keep a concise, generic operator guide with a link to official OpenAI guidance, explicit prerequisite/availability caveats, secure environment-variable handling, and the provider-portability boundary. Regenerate the manual and re-run its checks.

## Evidence

- Ran ticket-folder inventory with rg and read every discovered ticket document through MCP.
- Read the group context request; no context document was available.
- Reviewed the full PR diff, plan, report, working tree, and official OpenAI guidance.
- git diff --check main...doc-010-secure-mcp-tunnel passed, but formatting does not address the above scope/security issues.

**Verdict: needs changes.** Do not merge.
