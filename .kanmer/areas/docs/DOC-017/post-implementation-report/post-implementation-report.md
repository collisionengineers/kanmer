# Post-implementation report — DOC-017

## Summary

The roadmap now records the approved Cloudflare Tunnel-only boundary without changing the remote-access architecture or source code. Cloudflared is the named-tunnel adapter; the OpenAI Secure MCP Tunnel remains an independent OpenAI-managed stdio path; MCP-028 uses a disposable Cloudflare Worker only as its external MCP client; and Cloudflare Access, hosted Workers, relays, account/DNS automation, and provider lifecycle remain out of scope and operator-owned.

## Changes

| File | Change | Why |
|---|---|---|
| `MASTERPLAN.md` | Updated the 0.4.1 horizon, G-REMOTE contract, S-21 manual scope, S-22 integration proof, existing-ticket wording, and GA-17 rescope note. | Align roadmap and seed/dependency prose with the approved EPIC-010 contract and FRD-025/ADR-0017. |

The EPIC-010 group context was inspected and already matched the approved boundary, so it was not rewritten. No governing document, source code, generated manual, provider configuration, or Cloudflare resource changed.

## Governing docs

- FRD-025 remains authoritative for one local Streamable HTTP endpoint, mandatory bearer auth, loopback binding, project isolation, and provider-neutral adapters; the roadmap now repeats those boundaries without expanding them.
- ADR-0017 remains authoritative for Streamable HTTP as the remote transport and the independent stdio/OpenAI path; the roadmap no longer calls OpenAI Secure MCP Tunnel a cloudflared adapter.
- DOC-010 remains the independent OpenAI Secure MCP Tunnel manual; the roadmap points to it as such.
- EPIC-010 context remains unchanged and consistent.

## Risks / follow-ups

- MCP-021, MCP-026, MCP-027, GUI-095, DOC-013, and MCP-028 still own implementation and integration proof; this ticket does not claim their behavior.
- A future hosted Worker or Cloudflare Access mode requires a new ADR and ticket set.
- No secrets, real hostnames, or provider credentials were added.

## Verification hand-off

On merged `main`, re-run:
- `node scripts/build-manual.mjs --check`
- `git diff --check`
- targeted stale-wording searches for the removed OpenAI-as-adapter and second-machine claims
- compare the changed roadmap lines with EPIC-010/context.md, FRD-025, ADR-0017, DOC-010, MCP-021, and MCP-028
