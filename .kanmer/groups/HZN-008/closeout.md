# HZN-008 programme closeout — reliable autonomy and multi-controller operation

Written 2026-09-05 as the successor record for the retired root `CLOSEOUT_PLAN.md` (see [[DOC-026]]). This is a pointer document; the authoritative evidence lives on the tickets named below and in `apps/gui/release-notes.md`.

## Releases that closed the horizon

- **v0.4.0** — released and promoted as the live control plane on 2026-09-01 ([[CORE-136]]).
- **v0.4.1** — published 2026-09-04, merge `4e94ad806d5f74dbfdc9b0789190624addf4cbdd`, tag `v0.4.1`, production-verified ([[CORE-137]]). Release ledger attempt `main@1` is terminal `released` with verification passed and four asset digests. Included PRs #310–#319: [[MCP-055]], [[GUI-147]], [[SKILL-039]], [[GUI-149]], [[CORE-139]], [[MCP-056]], [[CORE-133]], [[GUI-150]], [[CORE-119]], [[CORE-137]].

## Historical release attempts, preserved as retired non-success

- [[CORE-103]] — v0.3.8 immutable partial release; archived in Verifying with its failure proof. Never retagged.
- [[CORE-107]] — v0.3.9 recovery attempt; archived in Verifying. Superseded by v0.3.10–v0.3.12 and v0.4.x.
- [[MCP-028]] — remote-access integration verification; operator-retired 2026-09-01 with INCONCLUSIVE public-route evidence and no successor.
- [[MCP-051]] — retired alongside MCP-028.

These records keep their non-PASS proofs. Nothing here converts them to Done.

## Where the old closeout plan's items ended up

| CLOSEOUT_PLAN.md item | Outcome |
|---|---|
| Recover from v0.3.8, publish v0.3.9 | superseded by v0.3.10 → v0.4.1 |
| CORE-036, CORE-042 to Done | Done; historical bodies reconciled under [[DOC-026]] scope notes, not reopened |
| Cloudflare / OpenAI tunnel operation | OpenAI tunnel managed runtime shipped ([[GUI-141]]); Cloudflare public route retired with MCP-028 |
| Installed-app proof rather than source | delivered by [[CORE-137]] (packaged, copied-board and rollback checks) |

## Successor

Active work continues under [[HZN-009]] (0.4.2 — Delivery Recovery) and [[HZN-010]] (0.5.0 — Coherent Workflow).
