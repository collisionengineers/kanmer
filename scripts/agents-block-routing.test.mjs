// DOC-028: the managed block routes work by purpose (direct vs tracked),
// names the configured integration branch instead of a literal `main`,
// scopes ticket loading to what the current step needs, and states a
// one-heavy-verifier-per-host rule.
//
// This fixture pins the exact sentences the ticket introduced/rewrote so a
// future rewrite of BLOCK_BODY cannot silently drop or duplicate them, and
// re-asserts the structural invariant (24 numbered rules, in order, under
// the 4 group headings) that predates this ticket and must survive it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { BLOCK_BODY } from "./agents-block-body.mjs";

/** Count of non-overlapping occurrences of an exact literal substring. */
function occurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

const ROUTING_SENTENCES = [
  "Resolve the request before starting a workflow.",
  "Proof is written on the configured integration branch after review and the merge, not before.",
  "Ordinary Done means integrated and accepted there.",
  "Deployment belongs to a release or an explicitly deployment-scoped ticket and is never a condition of ordinary Done.",
  "One heavy verification owner per host.",
];

test("each DOC-028 routing sentence appears exactly once in BLOCK_BODY", () => {
  for (const sentence of ROUTING_SENTENCES) {
    assert.equal(
      occurrences(BLOCK_BODY, sentence),
      1,
      `expected exactly one occurrence of ${JSON.stringify(sentence)}`,
    );
  }
});

test("BLOCK_BODY names delivery.integrationBranch, not a hardcoded branch", () => {
  assert.ok(BLOCK_BODY.includes("delivery.integrationBranch"));
  assert.ok(!BLOCK_BODY.includes("Proof is written on merged"));
});

test("the 24 numbered Agent conduct rules remain intact and in canonical order", () => {
  const rules = [...BLOCK_BODY.matchAll(/^(\d+)\. \*\*/gm)].map((match) => Number(match[1]));
  assert.equal(rules.length, 24, `expected 24 numbered rules, found ${rules.length}`);
  rules.forEach((rule, index) => assert.equal(rule, index + 1));
});

test("the 4 Agent conduct group headings remain intact", () => {
  for (const group of ["Scope", "Build", "Prove", "Conduct"]) {
    assert.ok(BLOCK_BODY.includes(`**${group}**`), `missing group heading **${group}**`);
  }
});
