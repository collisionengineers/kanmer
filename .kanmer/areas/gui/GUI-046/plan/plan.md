# 1.7 npm scripts

**File:** `package.json` (root)

```json
"dist:check": "npm run dist && node scripts/check-updater-package.mjs",
```

**Verify Phase 1** (this is the "prove it, don't just compile it" step):

```bash
npm install
npm run typecheck -w @kanmer/gui          # clean
npm run dist:check                        # -> "updater package OK (6 checks)"
cd apps/gui && KANMER_SMOKE=1 KANMER_OPEN="<a sandbox project>" \
  ./release/win-unpacked/Kanmer.exe --user-data-dir="<a fresh dir>"; echo $?
# -> 0. Note this runs the PACKAGED binary, not `npx electron .`.
```

The packaged boot smoke is the load-bearing one: it proves the shipped app finds `app-update.yml`, which is the exact "works in dev, silently dead when packaged" failure.

---
