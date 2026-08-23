import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The skill asset is the canonical source for the repository's descriptive
 * document-model mirror. Keep this check pure so the stale-fixture test can
 * prove both the positive and negative paths without touching a checkout.
 */
export function checkDocStructure({ canonical, mirror }) {
  const problems = [];
  if (canonical !== mirror) problems.push("docs/contributing/doc-structure.md differs from the kanmer-docs asset");

  for (const marker of [
    "six fixed stages",
    "files/*.md",
    "scratch/<slug>.md",
    "profile-resolved",
    "docs/product/prd/**",
    "docs/functional/frd/**",
    "docs/architecture/adr/**",
  ]) {
    if (!canonical.includes(marker)) problems.push(`canonical document model is missing ${marker}`);
  }

  for (const retired of [
    /storage format 2/i,
    /seven stages/i,
    /\bimpact\.md\b/i,
    /scratch-<slug>\.md/i,
  ]) {
    if (canonical.match(retired)) problems.push(`canonical document model contains retired marker ${retired}`);
    if (mirror.match(retired)) problems.push(`repository mirror contains retired marker ${retired}`);
  }

  return problems;
}

export function checkDocStructureFiles({ root }) {
  const canonical = readFileSync(
    join(root, "plugins", "kanmer", "skills", "kanmer-docs", "assets", "doc-structure.md"),
    "utf8",
  );
  const mirror = readFileSync(join(root, "docs", "contributing", "doc-structure.md"), "utf8");
  return checkDocStructure({ canonical, mirror });
}
