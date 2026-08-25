import assert from "node:assert/strict";
import test from "node:test";

import { exactUploadSpecs, releaseAssetNames } from "./release-publish.mjs";

const complete = {
  expected: [
    { localPath: "C:/release/Kanmer Setup 1.2.3.exe", name: "Kanmer-Setup-1.2.3.exe" },
    { localPath: "C:/release/Kanmer Setup 1.2.3.exe.blockmap", name: "Kanmer-Setup-1.2.3.exe.blockmap" },
    { localPath: "C:/release/kanmer-1.2.3.mcpb", name: "kanmer-1.2.3.mcpb" },
    { localPath: "C:/release/latest.yml", name: "latest.yml" },
  ],
};

test("uses explicit GitHub names for exact local upload arguments", () => {
  assert.deepEqual(exactUploadSpecs(complete.expected, "1.2.3"), [
    "C:/release/Kanmer Setup 1.2.3.exe#Kanmer-Setup-1.2.3.exe",
    "C:/release/Kanmer Setup 1.2.3.exe.blockmap#Kanmer-Setup-1.2.3.exe.blockmap",
    "C:/release/kanmer-1.2.3.mcpb#kanmer-1.2.3.mcpb",
    "C:/release/latest.yml#latest.yml",
  ]);
});

test("refuses to construct an upload from an incomplete expected set", () => {
  assert.throws(() => exactUploadSpecs([], "1.2.3"), /without expected local assets/);
  assert.throws(() => exactUploadSpecs([{ name: "latest.yml" }], "1.2.3"), /canonical set/);
  assert.throws(
    () => exactUploadSpecs([...complete.expected, { localPath: "C:/release/extra.zip", name: "extra.zip" }], "1.2.3"),
    /canonical set/,
  );
});

test("owns the one canonical public release asset-name set", () => {
  assert.deepEqual(releaseAssetNames("1.2.3"), [
    "Kanmer-Setup-1.2.3.exe",
    "Kanmer-Setup-1.2.3.exe.blockmap",
    "kanmer-1.2.3.mcpb",
    "latest.yml",
  ]);
});
