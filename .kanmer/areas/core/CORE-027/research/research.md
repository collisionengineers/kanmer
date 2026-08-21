# Research — CORE-027

The root core entry exports filesystem/store modules, so value imports cannot be browser-safe. The pure values already live in stages.ts and profiles.ts. deriveMembers is pure but is embedded in groups.ts with Node imports; extract it to a new pure module and re-export it only from a browser subpath.

A dedicated tsup browser entry plus package exports mapping lets UI import values without root-entry Node built-ins. A post-build test must reject node: specifiers in dist/browser.js. No user-only product decision remains.
