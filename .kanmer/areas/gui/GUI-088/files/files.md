# Files — GUI-088

## Where the change lands

| Path | Why |
|---|---|
| `apps/gui/src/main/connect.ts` | `installSkills` has the marketplace early return that bypasses `ensureAgentsBlock`; it also owns Connect's result notes and marketplace failure propagation. |
| `apps/gui/src/main/connect.test.ts` | Existing synthetic marketplace-provider harness can verify creation, byte-stable second Connect, user-visible note, failure behaviour, and marketplace-disconnect retention. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `apps/gui/src/main/agentsBlock.ts` | Exposes the managed-block application/removal primitives used by Connect; do not duplicate marker or preservation logic. |
| `scripts/agents-block.mjs` | Defines the shared managed-block contract and its idempotence/preservation semantics. |
| `apps/gui/src/main/providers.ts` | Identifies Claude and codex as marketplace installers and copy-skills hosts as the separate install kind. |
| `docs/functional/frd/FRD-012-connect.md` | R3 requires the managed block for every provider; R4 constrains destructive disconnect behaviour. |
| `docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md` | Establishes the managed block as universal orientation, above best-effort skills. |
| `GUI-073` | The linked ticket that exposed this code/spec divergence while correcting Connect-panel wording; it intentionally did not fix this implementation. |

## Ripple effects

- Connect output for Claude and codex gains the block-ensured note.
- The generic marketplace test harness should keep asserting real child-process success/failure semantics; tests must not replace the failing-command coverage.
- No provider registry, Electron packaging, skill bundle, or governing-doc content change is needed.

## Out of scope

- Redesigning copy-skills-host disconnect cleanup.
- Removing AGENTS.md on marketplace disconnect without an explicit user confirmation mechanism.
- Changing marketplace install commands, registrations, or plugin payloads.
