# 1.4 `.gitignore`

**File:** `.gitignore`

The working tree already has the `apps/gui/release-*/` rule (uncommitted) — fold it into this commit. Add one more line:

```
# local updater test feed config (Q6) — never committed, never packaged
apps/gui/dev-app-update.yml
```
