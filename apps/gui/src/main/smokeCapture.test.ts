import { describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { removeTreeWithRetry } from "@kanmer/core";
import {
  SMOKE_CAPTURE_PATH_ENV,
  captureSmokePage,
  requestedSmokeCapturePath,
  smokeMarkerScript,
  writeSmokeCapture,
} from "./smokeCapture.js";

function contents(overrides: Partial<Parameters<typeof captureSmokePage>[0]> = {}) {
  return {
    executeJavaScript: vi.fn().mockResolvedValue("current-marker"),
    capturePage: vi.fn().mockResolvedValue({
      isEmpty: () => false,
      toPNG: () => Buffer.from("png"),
      getSize: () => ({ width: 1280, height: 820 }),
    }),
    ...overrides,
  };
}

describe("requestedSmokeCapturePath", () => {
  it("is opt-in and refuses a blank output path", () => {
    expect(requestedSmokeCapturePath({})).toBeNull();
    expect(requestedSmokeCapturePath({ [SMOKE_CAPTURE_PATH_ENV]: "C:\\tmp\\capture.png" })).toBe(
      "C:\\tmp\\capture.png",
    );
    expect(() => requestedSmokeCapturePath({ [SMOKE_CAPTURE_PATH_ENV]: "  " })).toThrow(/must name/i);
    expect(() => requestedSmokeCapturePath({ [SMOKE_CAPTURE_PATH_ENV]: "C:\\tmp\\capture.txt" })).toThrow(
      /.png/i,
    );
  });
});

describe("writeSmokeCapture", () => {
  it("writes a new PNG and refuses to overwrite an existing artifact", async () => {
    const dir = await mkdtemp(join(tmpdir(), "kanmer-smoke-capture-"));
    const path = join(dir, "capture.png");
    try {
      await writeSmokeCapture(path, Buffer.from("fresh-png"));
      await expect(readFile(path, "utf8")).resolves.toBe("fresh-png");
      await expect(writeSmokeCapture(path, Buffer.from("replacement"))).rejects.toMatchObject({ code: "EEXIST" });
    } finally {
      await removeTreeWithRetry(dir);
    }
  });
});

describe("captureSmokePage", () => {
  it("injects a visible marker, reads it back, and returns the non-empty PNG", async () => {
    const page = contents();
    const result = await captureSmokePage(page, "current-marker");

    expect(page.executeJavaScript).toHaveBeenCalledWith(smokeMarkerScript("current-marker"));
    expect(page.capturePage).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ marker: "current-marker", size: { width: 1280, height: 820 } });
    expect(result.png.toString()).toBe("png");
  });

  it("fails closed when the renderer marker is stale or missing", async () => {
    const page = contents({ executeJavaScript: vi.fn().mockResolvedValue("old-marker") });
    await expect(captureSmokePage(page, "current-marker")).rejects.toThrow(/marker/i);
    expect(page.capturePage).not.toHaveBeenCalled();
  });

  it("fails closed for an empty NativeImage or PNG", async () => {
    const emptyImage = contents({
      capturePage: vi.fn().mockResolvedValue({
        isEmpty: () => true,
        toPNG: () => Buffer.alloc(0),
        getSize: () => ({ width: 0, height: 0 }),
      }),
    });
    await expect(captureSmokePage(emptyImage, "current-marker")).rejects.toThrow(/empty image/i);

    const emptyPng = contents({
      capturePage: vi.fn().mockResolvedValue({
        isEmpty: () => false,
        toPNG: () => Buffer.alloc(0),
        getSize: () => ({ width: 1, height: 1 }),
      }),
    });
    await expect(captureSmokePage(emptyPng, "current-marker")).rejects.toThrow(/empty PNG/i);
  });
});
