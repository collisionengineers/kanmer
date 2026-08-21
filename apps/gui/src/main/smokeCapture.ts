import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export const SMOKE_CAPTURE_PATH_ENV = "KANMER_SMOKE_CAPTURE_PATH";

export interface CapturedPage {
  isEmpty(): boolean;
  toPNG(): Buffer;
  getSize(): { width: number; height: number };
}

export interface CapturableWebContents {
  executeJavaScript(code: string): Promise<unknown>;
  capturePage(): Promise<CapturedPage>;
}

export interface SmokeCapture {
  marker: string;
  png: Buffer;
  size: { width: number; height: number };
}

/** Returns no path when capture was not requested; a blank request is an error. */
export function requestedSmokeCapturePath(env: NodeJS.ProcessEnv = process.env): string | null {
  const path = env[SMOKE_CAPTURE_PATH_ENV];
  if (path === undefined) return null;
  if (!path.trim()) throw new Error(`${SMOKE_CAPTURE_PATH_ENV} must name a PNG file`);
  if (!path.toLowerCase().endsWith(".png")) {
    throw new Error(`${SMOKE_CAPTURE_PATH_ENV} must name a .png file`);
  }
  return path;
}

export function smokeMarkerScript(marker: string): string {
  return `(() => {
    const id = "kanmer-smoke-capture-marker";
    document.getElementById(id)?.remove();
    const marker = document.createElement("div");
    marker.id = id;
    marker.textContent = ${JSON.stringify(marker)};
    marker.setAttribute("aria-label", "Kanmer smoke capture marker");
    Object.assign(marker.style, {
      position: "fixed", top: "12px", right: "12px", zIndex: "2147483647",
      padding: "8px 10px", border: "2px solid #ffffff", borderRadius: "4px",
      background: "#c21f39", color: "#ffffff", font: "700 14px monospace"
    });
    document.body.append(marker);
    return marker.textContent;
  })()`;
}

/** Captures the live renderer only after a visible, current DOM marker is confirmed. */
export async function captureSmokePage(
  contents: CapturableWebContents,
  marker: string,
): Promise<SmokeCapture> {
  const readBack = await contents.executeJavaScript(smokeMarkerScript(marker));
  if (readBack !== marker) throw new Error("renderer capture marker was not read back");

  const image = await contents.capturePage();
  if (image.isEmpty()) throw new Error("webContents.capturePage returned an empty image");
  const png = image.toPNG();
  if (png.length === 0) throw new Error("webContents.capturePage returned an empty PNG");

  return { marker, png, size: image.getSize() };
}

/** Create a new proof artifact; never silently overwrite an existing path. */
export async function writeSmokeCapture(path: string, png: Buffer): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, png, { flag: "wx" });
}
