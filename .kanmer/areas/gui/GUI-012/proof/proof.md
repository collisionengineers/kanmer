# Proof

Branch at `2ec1c8a`.

**Pure logic — 12 tests** (`lib/menu.test.ts`): opens at the pointer with room;
flips left near the right edge and up near the bottom; flips both in a corner;
pins a menu larger than the viewport; never places off the top or left; submenu
opens right, and left when that would overflow; arrows skip disabled both ways
and wrap; stays put when everything is disabled; Home/End find the first and
last enabled; a single enabled item does not spin.

**Removal verified:** `showItemMenu` returns zero matches in `main/index.ts`,
`preload/index.ts`, `shared/ipc.ts` and `App.tsx`. `Menu` survives in main only
for the application menu bar.

**Rail:** 116 core / 124 GUI, both typechecks, GUI build, boot smoke exit 0.

**Not proven here:** the visual pass in dark, light and system themes, and
keyboard operation against a real pointer. Those need a human at a running app —
FRD-019's acceptance calls for exactly that, and it is the one part of this
ticket a test cannot stand in for.
