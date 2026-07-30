#!/usr/bin/env node
/**
 * Generate the shell texture from the original low-poly tile.
 *
 *   npm run texture     # rewrite img/shell-texture.png from img/background.png
 *
 * The shell (sidebar, hero, compact header, top spill) draws this tile behind
 * a flat dark overlay, `--sidebar-overlay`. Compositing is affine, so the
 * overlay scales the tile's contrast by exactly `1 - alpha`: the tile has to
 * carry all of the contrast the overlay is about to take away.
 *
 * img/background.png is the 2017 tile and is very flat — its luminance
 * standard deviation is 2.1 of 255. Through a 0.68 overlay that left 0.7,
 * which is why the pattern read as a solid blue. Halving the overlay and
 * darkening the tile to compensate keeps the shell the same color while
 * letting the facets through.
 *
 * The transform is a per-palette-entry color map, so the output reuses the
 * source's pixel data untouched and only its palette changes.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'img', 'background.png');
const OUTPUT = path.join(ROOT, 'img', 'shell-texture.png');

/* Keep these in step with css/main.css. `--sidebar-overlay` is the flat layer
   the shell paints over the tile, and the composited average is what
   `--shell-hero-dark` reports to iOS for browser-chrome tinting. */
const OVERLAY_RGB = [8, 18, 32];
const OVERLAY_ALPHA = 0.34;
const COMPOSITED_TARGET = [0x2b, 0x45, 0x57];

/* Luminance spread wanted in the composited shell, in 8-bit levels. Around 4
   the facets are legible without the source's dithering reading as grain. */
const COMPOSITED_CONTRAST = 4;

/* Under 1% of pixels sit far below the tile's mean. Limiting the input spread
   keeps those from amplifying into hard black specks. */
const CLAMP_SD = 3;

const luminance = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = -1;
  for (let i = 0; i < buffer.length; i += 1) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function readChunks(file) {
  const buffer = fs.readFileSync(file);
  const chunks = [];
  let offset = 8;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    chunks.push({ type, data: buffer.slice(offset + 8, offset + 8 + length) });
    offset += 12 + length;
    if (type === 'IEND') break;
  }
  return chunks;
}

function encodePng(chunks) {
  const parts = [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])];
  for (const chunk of chunks) {
    const header = Buffer.alloc(8);
    header.writeUInt32BE(chunk.data.length, 0);
    header.write(chunk.type, 4, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([header.slice(4), chunk.data])), 0);
    parts.push(header, chunk.data, crc);
  }
  return Buffer.concat(parts);
}

/* Undo PNG scanline filtering for an 8-bit palette image (one byte a pixel). */
function decodeIndices(chunks) {
  const ihdr = chunks.find((chunk) => chunk.type === 'IHDR').data;
  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  if (ihdr[8] !== 8 || ihdr[9] !== 3) throw new Error('Expected an 8-bit palette PNG');

  const raw = zlib.inflateSync(
    Buffer.concat(chunks.filter((chunk) => chunk.type === 'IDAT').map((chunk) => chunk.data)),
  );
  const pixels = Buffer.alloc(width * height);
  let read = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = raw[read];
    read += 1;
    const line = raw.slice(read, read + width);
    read += width;
    const row = pixels.slice(y * width, (y + 1) * width);
    const above = y > 0 ? pixels.slice((y - 1) * width, y * width) : Buffer.alloc(width);

    for (let x = 0; x < width; x += 1) {
      const left = x > 0 ? row[x - 1] : 0;
      const up = above[x];
      const upLeft = x > 0 ? above[x - 1] : 0;
      let value;
      if (filter === 0) value = line[x];
      else if (filter === 1) value = line[x] + left;
      else if (filter === 2) value = line[x] + up;
      else if (filter === 3) value = line[x] + ((left + up) >> 1);
      else if (filter === 4) {
        const estimate = left + up - upLeft;
        const dLeft = Math.abs(estimate - left);
        const dUp = Math.abs(estimate - up);
        const dUpLeft = Math.abs(estimate - upLeft);
        const nearest = dLeft <= dUp && dLeft <= dUpLeft ? left : (dUp <= dUpLeft ? up : upLeft);
        value = line[x] + nearest;
      } else throw new Error(`Unsupported PNG filter ${filter}`);
      row[x] = value & 255;
    }
  }

  return pixels;
}

/* Pixel-weighted, not palette-weighted: the source carries dark entries that
   almost no pixel uses, and they would skew a flat palette average. */
function measure(palette, pixels) {
  const histogram = new Array(256).fill(0);
  for (const index of pixels) histogram[index] += 1;

  const entryLuminance = (index) => luminance(
    palette[index * 3], palette[index * 3 + 1], palette[index * 3 + 2],
  );

  let mean = 0;
  for (let i = 0; i < 256; i += 1) if (histogram[i]) mean += entryLuminance(i) * histogram[i];
  mean /= pixels.length;

  let variance = 0;
  for (let i = 0; i < 256; i += 1) {
    if (!histogram[i]) continue;
    variance += (entryLuminance(i) - mean) ** 2 * histogram[i];
  }

  return { mean, sd: Math.sqrt(variance / pixels.length) };
}

function buildShellTexture() {
  const chunks = readChunks(SOURCE);
  const source = chunks.find((chunk) => chunk.type === 'PLTE').data;
  const stats = measure(source, decodeIndices(chunks));

  /* Average tile color that composites to COMPOSITED_TARGET under the overlay,
     and the gain that leaves COMPOSITED_CONTRAST once the overlay flattens it. */
  const base = COMPOSITED_TARGET.map(
    (target, channel) => (target - OVERLAY_ALPHA * OVERLAY_RGB[channel]) / (1 - OVERLAY_ALPHA),
  );
  const baseLuminance = luminance(base[0], base[1], base[2]);
  const gain = (COMPOSITED_CONTRAST / (1 - OVERLAY_ALPHA))
    / (baseLuminance * (stats.sd / stats.mean));

  const palette = Buffer.alloc(768);
  for (let i = 0; i < 256; i += 1) {
    const entry = luminance(source[i * 3], source[i * 3 + 1], source[i * 3 + 2]);
    const deviation = Math.max(-CLAMP_SD, Math.min(CLAMP_SD, (entry - stats.mean) / stats.sd));
    const scaled = 1 + gain * ((deviation * stats.sd) / stats.mean);
    for (let channel = 0; channel < 3; channel += 1) {
      palette[i * 3 + channel] = Math.max(0, Math.min(255, Math.round(base[channel] * scaled)));
    }
  }

  const texture = encodePng(
    chunks.map((chunk) => (chunk.type === 'PLTE' ? { type: 'PLTE', data: palette } : chunk)),
  );
  return { texture, base, gain, stats };
}

if (require.main === module) {
  const { texture, base, gain, stats } = buildShellTexture();
  fs.writeFileSync(OUTPUT, texture);
  const hex = base.map((value) => Math.round(value).toString(16).padStart(2, '0')).join('');
  console.log(
    `Wrote img/shell-texture.png: source luminance ${stats.mean.toFixed(1)} ±${stats.sd.toFixed(2)}, `
      + `tile average #${hex}, contrast gain ${gain.toFixed(2)}×.`,
  );
}

module.exports = { buildShellTexture, OUTPUT };
