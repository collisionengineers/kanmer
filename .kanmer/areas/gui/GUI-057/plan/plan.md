# 5.3 CSS

**File:** `apps/gui/src/renderer/src/styles.css` — one rule beside `.banner.warn` (`:173`), same shape, informational tint:
```css
.banner.info {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #14202a;
  border-bottom: 1px solid #1f3543;
  color: var(--accent, #7ac0ff);
}
```
(`.banner` has no `[data-theme=light]` override today — that is pre-existing and out of scope.)

**Verify Phase 5:** `npm test` (13 new GUI cases green), `npm run typecheck -w @kanmer/gui`, `npm run build -w @kanmer/gui`, and the Phase 2 dev-feed loop again — this time the banner appears and "Restart now" opens the confirm. **Do not confirm it in the dev loop** (the payload is a mislabelled installer). Cancel and verify nothing happens.

---
