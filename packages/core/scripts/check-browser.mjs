import { readFile } from "node:fs/promises";
const bytes = await readFile(new URL("../dist/browser.js", import.meta.url), "utf8");
if (/\bnode:|from\s+["'](?:fs|path|crypto)["']/.test(bytes)) throw new Error("@kanmer/core/browser must not contain Node built-ins");
