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
    ticket: undefined,
  });
  assert.deepEqual(parseReleaseArgs(["0.4.0", "--ticket", "CORE-042", "--publish", "--release-commit", "a".repeat(40)]), {
    version: "0.4.0",
    dryRun: false,
    publish: true,
    releaseCommit: "a".repeat(40),
    ticket: "CORE-042",
  });
  assert.deepEqual(parseReleaseArgs(["0.4.0", "--dry-run", "--publish"]), {
    version: "0.4.0",
    dryRun: true,
    publish: true,
    releaseCommit: undefined,
    ticket: undefined,
  });
});

test("rejects unknown options and extra positional arguments", () => {
  assert.throws(() => parseReleaseArgs(["0.4.0", "--not-an-option"]), /unknown option/);
  assert.throws(() => parseReleaseArgs(["0.4.0", "0.4.1"]), /unexpected positional/);
  assert.throws(() => parseReleaseArgs(["0.4.0", "--ticket"]), /needs a value/);
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

test("publish mode awaits the GUI build before creating or pushing the immutable tag", () => {
  const source = readFileSync(new URL("./release.mjs", import.meta.url), "utf8");
  const publishStart = source.indexOf("if (publishMode) {\n  assertMergedManifestVersions();\n  assertReleaseCommitReachable();");
  const publishEnd = source.indexOf("\n} else {", publishStart);
  const guiBuild = "run(\"npm run build -w @kanmer/gui\");";
  const buildIndex = source.indexOf(guiBuild, publishStart);
  const tagIndex = source.indexOf("run(`git tag ${releaseTag(version)}`);");
  const tagPushIndex = source.indexOf("run(`git push origin ${releaseTagRef(version)}`);");

  assert.notEqual(publishStart, -1, "publish preconditions must exist");
  assert.notEqual(publishEnd, -1, "publish preconditions must close before preparation mode");
  assert.ok(buildIndex > publishStart && buildIndex < publishEnd, "publish mode must invoke the GUI build");
  assert.ok(tagIndex > buildIndex, "tag creation must follow the GUI build");
  assert.ok(tagPushIndex > tagIndex, "tag push must follow tag creation");
  assert.match(source, /function run\(command, cwd = root\) \{[\s\S]*execSync\(command/);
});

test("tag release verification packages without scheduling a publisher", () => {
  const workflow = readFileSync(new URL("../.github/workflows/release.yml", import.meta.url), "utf8");
  assert.match(workflow, /^permissions:\n  contents: read$/m);

  const stepStart = workflow.indexOf("      - name: Build and check the packaged updater");
  const nextStep = workflow.indexOf("\n      - name:", stepStart + 1);
  assert.notEqual(stepStart, -1, "the packaged-updater step must exist");
  assert.notEqual(nextStep, -1, "the packaged-updater step must have a following step");
  const packageStep = workflow.slice(stepStart, nextStep);

  assert.match(
    packageStep,
    /run: \|\n          npm run build\n          npm run build -w @kanmer\/gui\n          npm run dist -w @kanmer\/gui -- --publish never\n          node scripts\/check-updater-package\.mjs/,
  );
  assert.doesNotMatch(packageStep, /\bGH_TOKEN\b/);
  assert.match(workflow, /verify-release-assets\.mjs "\$VERSION" --remote-coherent/);
});

test("publisher packages once, then explicitly creates and uploads the release", () => {
  const source = readFileSync(new URL("./release.mjs", import.meta.url), "utf8");
  assert.match(source, /npx electron-builder --win --publish never/);
  assert.doesNotMatch(source, /electron-builder --win --publish always/);
  assert.match(source, /gh release create \$\{releaseTag\(version\)\}/);
  assert.match(source, /gh release upload \$\{releaseTag\(version\)\}/);
  assert.match(source, /--notes-file "\$\{notesPath\}" --draft/);
  assert.match(source, /gh release edit \$\{releaseTag\(version\)\} --draft=false --latest/);
  assert.doesNotMatch(source, /gh release upload[^\n]*--clobber/);
  assert.match(source, /tag .* already exists locally or on origin/);
  assert.match(source, /GitHub Release .* already exists/);
  assert.match(source, /process\.env\.GH_TOKEN = process\.env\[tokenVar\]/);
  assert.match(source, /await fetchReleaseAssets\(\{/);
  assert.match(source, /error\?\.kind !== "not-found"/);
  assert.doesNotMatch(source, /error\?\.status !== 1/);

  const createAt = source.indexOf("gh release create");
  const uploadAt = source.indexOf("gh release upload");
  const verifyAt = source.indexOf("check = await verifyRelease");
  const publishAt = source.indexOf("gh release edit");
  assert.ok(createAt < uploadAt && uploadAt < verifyAt && verifyAt < publishAt);
});
