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

# Re-review — PR #64 (revised) — PASS

## Verdict

**PASS — no blocking findings.** The revised PR returns to the approved documentation-only scope and is safe to merge from an independent review perspective. I did not merge or move the ticket.

## Scope and safety

- main...767394e29d438371b64c3191bf936a4ab5792ecd changes exactly the planned files: README.md, docs/manual/connect.md, and regenerated apps/gui/src/renderer/src/manual/chapters.generated.ts.
- The earlier private launcher, Infisical/workspace configuration, tunnel identifier, personal absolute paths, and secret-management files are absent from the final PR diff.
- The manual uses only generic placeholders (<you>, <tunnel-id>, C:/path/to/project) and explicitly keeps the runtime key in the process environment, out of the profile and source control.
- It retains the intended boundary: Kanmer neither stores credentials nor supervises the tunnel; it does not create a public endpoint; Cloudflare is not represented as a provider-neutral MCP endpoint.

## Plan, report, and governing-doc alignment

- The plan calls for one focused Connect-manual section, a README pointer, static validation, a direct-Markdown explanation, and clear portability/security limits. The final diff implements those items only.
- FRD-022 remains unchanged: the text documents the existing stdio surface rather than changing tool/server behavior. FRD-024 is met by updating the authored Connect chapter and regenerating the in-app chapter.
- The report's limitations are accurately preserved: live validation was conditional on the operator runtime key, while the revised docs record the subsequently confirmed connection without claiming a checked-in credential or new product integration.
- Ticket open questions are explicitly parked; the EPIC-010 context's no-plaintext-secret, localhost/default isolation, and no-new-transport constraints are respected.

## Official OpenAI guidance check — 2026-08-20

Current official Secure MCP Tunnel guidance at https://developers.openai.com/api/docs/guides/secure-mcp-tunnels confirms the document's material claims: outbound HTTPS only; no public listener; a runtime API key and a reachable stdio/HTTP MCP target; Tunnels Read + Use to run/select a tunnel; separate ChatGPT developer-mode access; platform/workspace association; init → doctor → run; and selecting Tunnel when creating the ChatGPT developer-mode app. The documented private-boundary and provider-portability conclusions agree with that guidance.

## Independent checks

- git diff --check main...767394e29d438371b64c3191bf936a4ab5792ecd — pass.
- Exact final changed-file inventory — only the three planned documentation/generated-manual paths above.
- npm run check:manual — pass, manual current (19 chapters).
- npm test -w @kanmer/gui -- manual.test.ts — pass, 11/11.
- npm run typecheck -w @kanmer/gui — pass.
- DOC-010 worktree clean after checks.

## Non-blocking note

For a time-sensitive external workflow, a direct link to the official Secure MCP Tunnel guide would improve future maintainability; the current generic wording is accurate and the absence of that link is not a merge blocker.
