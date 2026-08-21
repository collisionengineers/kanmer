# Checklist

- [x] `lib/profileDraft.ts` mirrors core's rules, vocabulary passed in
- [x] split order matches `parseRequirement` exactly
- [x] vitest covers each rule and the split-order cases
- [x] per-boundary requirement inputs, inline errors
- [x] area default-profile selects
- [x] proof-type editor
- [x] save explicit, disabled while invalid
- [x] affected-ticket count shown before saving
- [x] draft preserves board fields the editor does not touch
- [x] AGENTS.md §7 records the third duplication
- [x] typecheck, build, boot smoke

Verification evidence: focused `profileDraft.test.ts` 28/28; full GUI Vitest 349/349 across 37 files; root `npm run typecheck` exit 0; `npm run build --workspace @kanmer/gui` exit 0; `KANMER_SMOKE=1 KANMER_OPEN=<repo-root> npx electron . --user-data-dir=<fresh-temp>` exit 0. The editor implementation was already present on the base branch from an older untraceable commit; this lane audited it and added the responsive profile-table styling plus `aria-invalid` affordance.
