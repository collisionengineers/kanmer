// Generate build/icon.ico from the committed square source artwork. The ICO
// contains the sizes Windows uses for taskbar, shortcuts, and Explorer.
import { deflateSync, inflateSync } from "node:zlib";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SIZES = [16, 24, 32, 48, 64, 128, 256];
const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, "..", "build", "icon.png");
const out = join(here, "..", "build", "icon.ico");

/** Decode the checked-in non-interlaced, 8-bit RGBA PNG without a build dependency. */
function decodePng(file) {
  const png = readFileSync(file);
  if (png.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error(`${file} is not a PNG`);
  let offset = 8;
  let width = 0;
  let height = 0;
  const idat = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString("ascii");
    const data = png.subarray(offset + 8, offset + 8 + length);
    offset += length + 12;
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) throw new Error("icon.png must be an 8-bit, RGBA, non-interlaced PNG");
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
  }
  if (!width || !height || idat.length === 0) throw new Error("icon.png is missing image data");
  const stride = width * 4;
  const raw = inflateSync(Buffer.concat(idat));
  if (raw.length !== height * (stride + 1)) throw new Error("icon.png has unexpected scanline data");
  const pixels = Buffer.alloc(width * height * 4);
  let read = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[read++];
    const row = pixels.subarray(y * stride, (y + 1) * stride);
    const prev = y === 0 ? null : pixels.subarray((y - 1) * stride, y * stride);
    for (let x = 0; x < stride; x++) {
      const value = raw[read++];
      const left = x >= 4 ? row[x - 4] : 0;
      const up = prev ? prev[x] : 0;
      const upLeft = prev && x >= 4 ? prev[x - 4] : 0;
      if (filter === 0) row[x] = value;
      else if (filter === 1) row[x] = (value + left) & 0xff;
      else if (filter === 2) row[x] = (value + up) & 0xff;
      else if (filter === 3) row[x] = (value + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) row[x] = (value + paeth(left, up, upLeft)) & 0xff;
      else throw new Error(`icon.png uses unsupported PNG filter ${filter}`);
    }
  }
  return { width, height, pixels };
}

function paeth(left, up, upLeft) {
  const p = left + up - upLeft;
  const dl = Math.abs(p - left);
  const du = Math.abs(p - up);
  const dul = Math.abs(p - upLeft);
  return dl <= du && dl <= dul ? left : du <= dul ? up : upLeft;
}

/** Bilinear resize in premultiplied alpha, so transparent icon edges stay clean. */
function resize({ width, height, pixels }, size) {
  const output = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    const sy = Math.min(height - 1, Math.max(0, (y + 0.5) * height / size - 0.5));
    const y0 = Math.floor(sy);
    const y1 = Math.min(height - 1, y0 + 1);
    const fy = sy - y0;
    for (let x = 0; x < size; x++) {
      const sx = Math.min(width - 1, Math.max(0, (x + 0.5) * width / size - 0.5));
      const x0 = Math.floor(sx);
      const x1 = Math.min(width - 1, x0 + 1);
      const fx = sx - x0;
      const samples = [[x0, y0, (1 - fx) * (1 - fy)], [x1, y0, fx * (1 - fy)], [x0, y1, (1 - fx) * fy], [x1, y1, fx * fy]];
      let alpha = 0, red = 0, green = 0, blue = 0;
      for (const [px, py, weight] of samples) {
        const at = (py * width + px) * 4;
        const a = pixels[at + 3] / 255 * weight;
        alpha += a;
        red += pixels[at] * a;
        green += pixels[at + 1] * a;
        blue += pixels[at + 2] * a;
      }
      const at = (y * size + x) * 4;
      output[at + 3] = Math.round(alpha * 255);
      output[at] = alpha === 0 ? 0 : Math.round(red / alpha);
      output[at + 1] = alpha === 0 ? 0 : Math.round(green / alpha);
      output[at + 2] = alpha === 0 ? 0 : Math.round(blue / alpha);
    }
  }
  return output;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const value of buf) c = CRC_TABLE[(c ^ value) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, checksum]);
}

function encodePng(pixels, size) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", header), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

const image = decodePng(source);
const pngs = SIZES.map((size) => ({ size, data: encodePng(resize(image, size), size) }));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(pngs.length, 4);
let offset = 6 + pngs.length * 16;
const entries = pngs.map(({ size, data }) => {
  const entry = Buffer.alloc(16);
  entry[0] = size === 256 ? 0 : size;
  entry[1] = size === 256 ? 0 : size;
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(data.length, 8);
  entry.writeUInt32LE(offset, 12);
  offset += data.length;
  return entry;
});
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, Buffer.concat([header, ...entries, ...pngs.map(({ data }) => data)]));
console.log(`icon: wrote ${out} from ${source} (${SIZES.join(", ")} px)`);
