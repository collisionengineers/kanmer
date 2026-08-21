# Open questions — DOC-013

## Resolved decisions

- **What is the implementation evidence baseline?** MCP-027 is merged in PR #114 at `765c3f6f3ef27ea8b7d7223267b181a19a7d0de6`. Its schema-v1 doctor report, 26-check registry, `config|local|public` modes, optional `--json`, protected references, safe redaction, and exit codes 0/1/2 are the documentation contract. The source of truth is `packages/mcp-server/src/doctor-cli.ts` and the five `doctor/` modules, not old ticket prose.
- **What must happen before GUI wording is written?** GUI-095 must be independently reviewed, merged to main, and have its post-implementation report/proof. Only then may DOC-013 copy exact labels, fields, storage/permission behavior, owner conflict, auto-start, true quit, rotation/revoke, status, and doctor presentation. Provisional files in the GUI-095 worktree are not a contract.
- **What must happen before public claims are finalized?** MCP-028 merged proof is required for public-provider, Worker, client, and disposable end-to-end acceptance claims. Until then, document only the shipped local/adapter contract and clearly mark public evidence as downstream.
- **Where does the manual live?** Authored chapters live in `docs/manual/`; the canonical new files are `remote-access.md`, `remote-access-troubleshooting.md`, and `providers/cloudflared.md`. There is no `docs/manual/README.md`.
- **How is the in-app manual updated?** Extend `CHAPTERS` in `scripts/build-manual.mjs` and regenerate `apps/gui/src/renderer/src/manual/chapters.generated.ts`; never hand-edit the generated artifact.
- **How is docs verification added?** No `scripts/verify-docs.mjs` or `verify:docs` exists today. DOC-013 may add one deterministic docs-only verifier and `verify:docs`, but must not redefine a shared root `verify` surface owned elsewhere.
- **What is the headless command contract?** `kanmer-doctor` is the packaged doctor bin and accepts only `config|local|public` plus optional `--json`. `kanmer-mcp-remote` accepts no arguments and uses protected token/tunnel configuration. Exact examples are written only after disposable runs against the built package.
- **What is the provider boundary?** The generic manual describes HTTPS Streamable HTTP plus Kanmer bearer. The provider appendix describes only the locally managed named Cloudflare Tunnel. Access, Quick Tunnels for production, remote-managed token mode, account/DNS automation, executable download, and hosted Kanmer Worker are unsupported here.
- **How are credentials and clients described?** Use “bearer token” only for the Kanmer application credential and “provider credential” for tunnel material. Use generic HTTPS `/mcp` and `Authorization: Bearer <token>`; add client-specific formats only after a current disposable test with version/date/platform recorded.
- **How are security and lifecycle limits described?** State one project/fingerprint per endpoint/process, bearer in addition to provider controls, no per-user identity, one active token, rotation disconnects sessions, true GUI quit ends GUI ownership, headless ownership is separate, and remote tools remain subject to Kanmer workflow gates. Never document raw token arguments, insecure TLS, wildcard binds, token URLs, raw logs, or blind retries.
- **Does DOC-013 change governance or implementation?** No. It adds documentation, generated-manual indexing, and a docs-only verifier; it does not modify FRD/ADR requirements, remote-access code, the plugin, provider infrastructure, or the separate DOC-010 path.

## Deferred explicitly

- [deferred] Additional tunnel-provider appendices until adapters ship.
- [deferred] MCP-028 public-provider/Worker/client acceptance details until its proof is merged.
- [deferred] Unverified remote-client-specific recipes.
- [deferred] Always-on OS service/supervisor setup as a Kanmer-owned feature.
- [deferred] OAuth/per-user identity migration guidance.
- [deferred] Screenshot-heavy walkthroughs and localization.

No unresolved design questions remain. The GUI-095 and MCP-028 items above are resolved workflow gates: they constrain when claims may be written, rather than inviting guesses or requiring a design decision.
