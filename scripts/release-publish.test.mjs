import assert from "node:assert/strict";
import test from "node:test";

import { exactUploadSpecs } from "./release-publish.mjs";

const complete = {
  expected: [
    { localPath: "C:/release/Kanmer Setup 1.2.3.exe", name: "Kanmer-Setup-1.2.3.exe" },
    { localPath: "C:/release/Kanmer Setup 1.2.3.exe.blockmap", name: "Kanmer-Setup-1.2.3.exe.blockmap" },
    { localPath: "C:/release/latest.yml", name: "latest.yml" },
  ],
};

test("uses explicit GitHub names for exact local upload arguments", () => {
  assert.deepEqual(exactUploadSpecs(complete.expected), [
    "C:/release/Kanmer Setup 1.2.3.exe#Kanmer-Setup-1.2.3.exe",
    "C:/release/Kanmer Setup 1.2.3.exe.blockmap#Kanmer-Setup-1.2.3.exe.blockmap",
    "C:/release/latest.yml#latest.yml",
  ]);
});

test("refuses to construct an upload from an incomplete expected set", () => {
  assert.throws(() => exactUploadSpecs([]), /without expected local assets/);
  assert.throws(() => exactUploadSpecs([{ name: "latest.yml" }]), /lacks its local path/);
});
