import assert from "node:assert/strict";
import test from "node:test";

import { exactUploadSpecs, settlePublication } from "./release-publish.mjs";

const complete = {
  ok: true,
  derivationBroken: false,
  expected: [
    { localPath: "C:/release/Kanmer Setup 1.2.3.exe", name: "Kanmer-Setup-1.2.3.exe" },
    { localPath: "C:/release/Kanmer Setup 1.2.3.exe.blockmap", name: "Kanmer-Setup-1.2.3.exe.blockmap" },
    { localPath: "C:/release/latest.yml", name: "latest.yml" },
  ],
  problems: [],
};

const incomplete = {
  ...complete,
  ok: false,
  problems: [{ asset: "latest.yml", severity: "error", detail: "missing" }],
};

test("uses explicit GitHub names for exact local upload arguments", () => {
  assert.deepEqual(exactUploadSpecs(complete.expected), [
    "C:/release/Kanmer Setup 1.2.3.exe#Kanmer-Setup-1.2.3.exe",
    "C:/release/Kanmer Setup 1.2.3.exe.blockmap#Kanmer-Setup-1.2.3.exe.blockmap",
    "C:/release/latest.yml#latest.yml",
  ]);
});

test("refuses to construct a repair from an incomplete expected set", () => {
  assert.throws(() => exactUploadSpecs([]), /without expected local assets/);
  assert.throws(() => exactUploadSpecs([{ name: "latest.yml" }]), /lacks its local path/);
});

test("a publisher 422 with complete remote assets succeeds without repair", async () => {
  const publisherError = new Error("422 already_exists");
  let verifies = 0;
  let repairs = 0;
  const result = await settlePublication({
    publisherError,
    verify: async () => {
      verifies++;
      return complete;
    },
    repair: async () => repairs++,
  });

  assert.equal(result.status, "verified");
  assert.equal(result.publisherError, publisherError);
  assert.equal(result.repaired, false);
  assert.equal(verifies, 1);
  assert.equal(repairs, 0);
});

test("an incomplete partial publish repairs exact files once then re-verifies", async () => {
  const checks = [incomplete, complete];
  const uploaded = [];
  const result = await settlePublication({
    publisherError: new Error("422 already_exists"),
    verify: async () => checks.shift(),
    repair: async (expected) => uploaded.push(...exactUploadSpecs(expected)),
  });

  assert.equal(result.status, "verified");
  assert.equal(result.repaired, true);
  assert.deepEqual(uploaded, exactUploadSpecs(complete.expected));
  assert.equal(checks.length, 0);
});

test("a failed exact-file repair refuses without a second package attempt", async () => {
  let repairAttempts = 0;
  const result = await settlePublication({
    verify: async () => incomplete,
    repair: async () => {
      repairAttempts++;
      throw new Error("network unavailable");
    },
  });

  assert.equal(result.status, "repair-failed");
  assert.equal(repairAttempts, 1);
  assert.equal(result.error.message, "network unavailable");
});

test("a still-incomplete release gets one repair and exactly one final re-check", async () => {
  let verifies = 0;
  let repairs = 0;
  const result = await settlePublication({
    verify: async () => {
      verifies++;
      return incomplete;
    },
    repair: async () => repairs++,
  });

  assert.equal(result.status, "still-incomplete");
  assert.equal(verifies, 2);
  assert.equal(repairs, 1);
});

test("a verifier failure is reported as a failed check, never repaired", async () => {
  let repairs = 0;
  const result = await settlePublication({
    verify: async () => {
      throw new Error("rate limited");
    },
    repair: async () => repairs++,
  });

  assert.equal(result.status, "check-failed");
  assert.equal(repairs, 0);
  assert.equal(result.error.message, "rate limited");
});
