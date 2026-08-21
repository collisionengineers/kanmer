# Open questions — DOC-013

## Resolved decisions

- **Primary audience paths?** One recommended GUI-managed path and one explicit headless path, both sharing the same security/doctor model.
- **Provider-neutral structure?** The main manual uses provider-neutral terms. Cloudflared account/tunnel/DNS/credential details live in a separate provider appendix.
- **Does the manual document Quick Tunnels?** Only as explicitly unsupported for production remote MCP; no setup path.
- **What is the public success definition?** A passing MCP-027 public doctor for the current project/config/runtime/auth generation, not a live child or “connected” tunnel status.
- **What commands are documented?** Only actual built/package commands verified after MCP-021/025/026/027 implementation. Proposed ticket filenames/flags are not copied blindly.
- **What UI labels are documented?** Exact GUI-095 shipped labels/states/actions, verified through the built app/tests.
- **How are client examples handled?** State the generic HTTPS `/mcp` plus standard bearer contract. Add client-specific examples only when their current format/version is tested and clearly dated; do not guess.
- **How is bearer delivery described?** One-time secure generation/rotation; ordinary status shows fingerprint only; no raw CLI argument/plaintext setting; lost token is recovered by rotation.
- **Can GUI remote access continue after true app quit?** No. State this explicitly; headless operation is a separate owner/process path.
- **Can GUI and headless own the same project/tunnel?** No. Explain duplicate-owner refusal and safe resolution.
- **How are all projects covered?** Explain independent fingerprint-bound configuration, bounded auto-start, unique hostname/tunnel identity, and isolated failures.
- **How is troubleshooting organized?** Exact MCP-027 check ids, layers, safe observed/expected meaning, ordered repair, rerun mode, and when to stop rather than retry.
- **Does the manual suggest auto-repair or insecure diagnostics?** No. No TLS bypass, wildcard bind, token URL, raw-log publication, or deterministic-failure retry.
- **Are screenshots required?** No. Prefer exact text/UI labels unless the repository has a maintained screenshot workflow; never capture a real token modal.
- **Where are secrets/examples sourced?** Only obvious placeholders and disposable synthetic values. Add a canary/pattern scan.
- **Does this ticket alter FRD/ADR requirements?** No; only add traceability references where canonical practice permits.
- **Does this ticket implement code or rebuild the plugin?** No.

## Deferred explicitly

- `[deferred]` Additional tunnel-provider appendices until adapters ship.
- `[deferred]` Unverified remote-client-specific recipes.
- `[deferred]` Always-on OS service/supervisor setup as a Kanmer-owned feature.
- `[deferred]` OAuth/per-user identity migration guide.
- `[deferred]` Screenshot-heavy walkthrough/localization.

No unresolved implementation questions remain.

## Resolved roadmap amendment — 2026-08-21

- **Cloudflare Access?** Not supported or documented for this release.
- **Cloudflare Worker?** Used only as the disposable remote MCP client for [[MCP-028]]; hosted Kanmer needs a separate ADR.
- **OpenAI tunnel?** Separate stdio route in [[DOC-010]], with future GUI work in [[GUI-104]].
