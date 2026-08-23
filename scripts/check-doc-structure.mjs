import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The skill asset is the target-neutral source for the repository's descriptive
 * document-model mirror. The mirror resolves repoDocs for its own board, so
 * this check validates the shared model plus each side's expected path shape.
 * Keep it pure so stale-fixture tests do not touch a checkout.
 */
export function checkDocStructure({ canonical, mirror }) {
  const problems = [];
  for (const marker of ["six fixed stages", "files/*.md", "scratch/<slug>.md", "profile-resolved"]) {
    if (!canonical.includes(marker)) problems.push(`canonical document model is missing ${marker}`);
    if (!mirror.includes(marker)) problems.push(`repository mirror is missing ${marker}`);
  }
  for (const marker of ["<board repoDocs.prd>", "<board repoDocs.frd>", "<board repoDocs.adr>"]) {
    if (!canonical.includes(marker)) problems.push(`canonical asset is missing target-neutral ${marker}`);
  }
  for (const marker of ["docs/product/prd/**", "docs/functional/frd/**", "docs/architecture/adr/**"]) {
    if (!mirror.includes(marker)) problems.push(`repository mirror is missing resolved ${marker}`);
    if (canonical.includes(marker)) problems.push(`canonical asset contains target-specific ${marker}`);
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
