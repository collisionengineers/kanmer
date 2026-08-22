import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  ancestryOutcome,
  isFullCommitSha,
  parseReleaseArgs,
  releaseBranch,
  releaseBranchRef,
  releaseTag,
  releaseTagRef,
} from "./release-flow.mjs";

test("parses prepare and publish invocations without treating a SHA as the version", () => {
  assert.deepEqual(parseReleaseArgs(["0.4.0"]), {
    version: "0.4.0",
    dryRun: false,
    publish: false,
    releaseCommit: undefined,
  });
  assert.deepEqual(parseReleaseArgs(["0.4.0", "--publish", "--release-commit", "a".repeat(40)]), {
    version: "0.4.0",
    dryRun: false,
    publish: true,
    releaseCommit: "a".repeat(40),
  });
  assert.deepEqual(parseReleaseArgs(["0.4.0", "--dry-run", "--publish"]), {
    version: "0.4.0",
    dryRun: true,
    publish: true,
    releaseCommit: undefined,
  });
});

test("rejects unknown options and extra positional arguments", () => {
  assert.throws(() => parseReleaseArgs(["0.4.0", "--not-an-option"]), /unknown option/);
  assert.throws(() => parseReleaseArgs(["0.4.0", "0.4.1"]), /unexpected positional/);
});

test("derives isolated branch and tag refs", () => {
  assert.equal(releaseBranch("0.4.0"), "release/v0.4.0");
  assert.equal(releaseTag("0.4.0"), "v0.4.0");
  assert.equal(releaseBranchRef("0.4.0"), "refs/heads/release/v0.4.0");
  assert.equal(releaseTagRef("0.4.0"), "refs/tags/v0.4.0");
});

test("requires full release commit SHAs and preserves Git ancestry outcomes", () => {
  assert.equal(isFullCommitSha("a".repeat(40)), true);
  assert.equal(isFullCommitSha("a".repeat(39)), false);
  assert.equal(isFullCommitSha("not-a-sha"), false);
  assert.equal(ancestryOutcome(0), "reachable");
  assert.equal(ancestryOutcome(1), "unreachable");
  assert.equal(ancestryOutcome(2), "indeterminate");
});

test("release source separates the PR branch push from the post-merge tag push", () => {
  const source = readFileSync(new URL("./release.mjs", import.meta.url), "utf8");
  assert.match(source, /git push --set-upstream origin \$\{releaseBranchRef\(version\)\}/);
  assert.match(source, /git push origin \$\{releaseTagRef\(version\)\}/);
  assert.match(source, /gh pr create --base main --head \$\{releaseBranch\(version\)\}/);
  assert.doesNotMatch(source, /run\("git push"\)/);
  assert.doesNotMatch(source, /git push --tags/);
});
