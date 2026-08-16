GUI-079's governing ADR was renumbered from ADR-0012 to ADR-0013.

Reason: this ticket's ADR (`docs/architecture/adr/ADR-0012-hosts-own-their-registration-file.md`, status `draft`, merged as PR #47 / `463ec04`) collided with MCP-010's ADR (`ADR-0012-board-discovery-order.md`, status `accepted`, merged first as PR #40 / `741ef81`). Both were in flight simultaneously and neither ticket could see the other's number land first, so both merged to main claiming ADR-0012.

Resolution (chore, no ticket, PR #51, merged as `26c8960`): since GUI-079's ADR merged second and was still `draft`, it was renumbered to **ADR-0013** and MCP-010's ADR-0012 was left untouched. The file was `git mv`'d to `ADR-0013-hosts-own-their-registration-file.md`, its heading updated, and a one-line historical note added pointing back to the old number. Every reference that means this ADR was updated: `docs/functional/frd/FRD-012-connect.md` (3 spots), `apps/gui/src/main/providers.ts` (3 spots), `apps/gui/src/main/providers.test.ts` (1 spot), and this ticket's own `refs` and body Outcome section (the `(ADR-0012.)` parenthetical is now `(ADR-0013.)`).

Anything citing "ADR-0012" for host registration ownership / grok's `.grok/config.toml` move should now cite **ADR-0013** instead.
