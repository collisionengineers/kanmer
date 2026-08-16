# Themed context menus — research

This one came from the user, not the roadmap, and the reason is concrete: an
Electron `Menu` is drawn by the OS and cannot see the app's CSS variables. The
whole GUI is built on tokens — `--bg-2`, `--line-2`, `--accent-dim`, `--radius`
— with a `[data-theme="light"]` override and a `system` mode that follows
`matchMedia`. A native menu participates in none of that. In dark mode on
Windows it renders light unless the OS agrees, it ignores the density setting,
and its corners do not match anything around them.

There is a second reason worth recording: the native path was an **async IPC
round-trip**. `showItemMenu` sent a payload to main, main built a template,
popped it, and resolved with the user's pick — including a 120 ms timer to
detect "closed without choosing". Rendering the menu makes it local state, which
removes the timer, the payload type, and the whole channel.

The third is that a native template cannot easily express *why* an item is
disabled. Gate reasons are per-ticket strings from `get_doc_gates`; a rendered
menu can put them in a tooltip.
