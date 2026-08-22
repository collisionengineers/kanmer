# GUI-114 files

## Production

- `apps/gui/src/main/providers.ts` — optional argv builder for CLI provider
  registrations and shell-safe copy-command formatting.
- `apps/gui/src/main/connect.ts` — execute the provider argv descriptor through
  `execFile` while preserving the fallback command string.

## Tests

- `apps/gui/src/main/providers.test.ts` — Claude argv shape and hostile branch
  string serialization.
- `apps/gui/src/main/connect.test.ts` — production registration seam captures
  argv and proves `team&whoami` is not shell-executed.

## Governing/documentation

- No governing-doc change is required: FRD-012 already specifies provider
  registration ownership and no shell-injected project state; the implementation
  makes that contract executable. The linked FRD-012 and ADR-0016 remain refs.

## Explicitly out of scope

No packages, MCP server changes, native plugin descriptor edits, GUI-113 source,
installer/NSIS changes, GitHub Actions/protection, or live host mutation.
