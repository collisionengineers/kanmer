# Plan — DOC-017: Record the Cloudflare Tunnel-only remote-access boundary

## Approach

Correct the roadmap to match the already-approved EPIC-010 contract, using FRD-025 and ADR-0017 as invariants. This avoids reopening architecture: the work is a focused consistency pass over roadmap statements, with the group context changed only if it no longer matches those governing documents.

## Governing docs

- **Meets FRD-025** — retain one loopback Streamable HTTP endpoint, mandatory Kanmer bearer auth, project isolation, and provider-specific adapters; describe the Worker only as MCP-028's disposable external client.
- **Meets ADR-0017** — keep Streamable HTTP as the remote transport and the OpenAI Secure MCP Tunnel as an independent stdio path rather than a cloudflared adapter.
- Neither governing document is modified by this ticket.

## Steps

1. Update the 0.4.1 horizon and G-REMOTE summaries in `MASTERPLAN.md` to say Cloudflare named Tunnel + Kanmer bearer only and to separate the OpenAI stdio path.
2. Update the remote-access seed/ticket descriptions and dependency prose so the disposable Worker is only MCP-028's external client and the final proof no longer claims a second machine.
3. State the exclusions consistently: no Access, Quick Tunnels, remote-managed tokens, DNS/account automation, hosted Worker server/proxy/relay, or provider credential lifecycle.
4. Compare the resulting roadmap against `EPIC-010/context.md`, FRD-025, ADR-0017, DOC-010, and the current MCP-021/MCP-028 scopes; change the group context only if an actual mismatch remains.
5. Run documentation/link checks and review the diff for accidental governance or source changes.

## Verification

Run the repository documentation/manual checks applicable to Markdown changes and targeted searches for stale claims that OpenAI is a cloudflared adapter or MCP-028 requires a second machine. Proof records the commands, clean exit codes, and the final consistency matrix.

## Risks / open questions

- Risk: broad wording changes could expand scope. Mitigation: every replacement is checked against the linked FRD/ADR and EPIC-010.
- No open questions.
