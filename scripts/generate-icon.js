#!/usr/bin/env node
// Generates assets/icon.png (512×512 RGBA) from scratch — no external deps.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const SIZE = 512;
const buf = new Uint8Array(SIZE * SIZE * 4); // RGBA, init = transparent

// ── drawing helpers ──────────────────────────────────────────────────────────

function idx(x, y) { return (y * SIZE + x) * 4; }

function blend(x, y, r, g, b, a) {
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
  const i = idx(x, y);
  const sa = a / 255;
  const da = buf[i + 3] / 255;
  const oa = sa + da * (1 - sa);
  if (oa === 0) return;
  buf[i]     = Math.round((r * sa + buf[i]     * da * (1 - sa)) / oa);
  buf[i + 1] = Math.round((g * sa + buf[i + 1] * da * (1 - sa)) / oa);
  buf[i + 2] = Math.round((b * sa + buf[i + 2] * da * (1 - sa)) / oa);
  buf[i + 3] = Math.round(oa * 255);
}

// Anti-aliased ellipse fill using 4× supersampling per edge pixel
function fillEllipse(cx, cy, rx, ry, r, g, b, a = 255) {
  const x0 = Math.max(0, Math.floor(cx - rx - 1));
  const x1 = Math.min(SIZE - 1, Math.ceil(cx + rx + 1));
  const y0 = Math.max(0, Math.floor(cy - ry - 1));
  const y1 = Math.min(SIZE - 1, Math.ceil(cy + ry + 1));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      // Supersample 2×2
      let hits = 0;
      for (let sy = 0; sy < 2; sy++) {
        for (let sx = 0; sx < 2; sx++) {
          const px = x + sx * 0.5;
          const py = y + sy * 0.5;
          const dx = (px - cx) / rx;
          const dy = (py - cy) / ry;
          if (dx * dx + dy * dy <= 1) hits++;
        }
      }
      if (hits > 0) blend(x, y, r, g, b, Math.round(a * hits / 4));
    }
  }
}

function fillRect(x0, y0, x1, y1, r, g, b, a = 255) {
  for (let y = Math.max(0, y0); y <= Math.min(SIZE - 1, y1); y++)
    for (let x = Math.max(0, x0); x <= Math.min(SIZE - 1, x1); x++)
      blend(x, y, r, g, b, a);
}

// ── icon drawing ─────────────────────────────────────────────────────────────

const cx   = SIZE / 2;
const rx   = 150;   // horizontal disc radius
const ry   = 34;    // vertical disc radius
const gap  = 90;    // spacing between disc centres
const topY = 168;   // y of top disc centre

// Disc Y positions (top → bottom)
const discs = [topY, topY + gap, topY + gap * 2];

// Cylinder body fill between top and bottom disc — sky-blue gradient feel
fillRect(cx - rx, topY, cx + rx, discs[2], 0x02, 0x84, 0xc7);

// Right shading strip
fillRect(cx + rx - 32, topY, cx + rx, discs[2], 0x0c, 0x4a, 0x6e, 130);

// Draw discs bottom-to-top so top disc sits on top
const discDefs = [
  // shadow color, main color top, main color bottom, highlight color
  [[11, 18, 32,  82], [0x0e, 0xa5, 0xe9], [0x02, 0x84, 0xc7], [0x38, 0xbd, 0xf8,  90]], // bottom
  [[11, 18, 32,  72], [0x38, 0xbd, 0xf8], [0x0e, 0xa5, 0xe9], [0x7d, 0xd3, 0xfc,  85]], // middle
  [[11, 18, 32,  56], [0x7d, 0xd3, 0xfc], [0x38, 0xbd, 0xf8], [0xba, 0xe6, 0xfd, 110]], // top
];

for (let i = discDefs.length - 1; i >= 0; i--) {
  const dy = discs[i];
  const [shad, colTop, colBot, hl] = discDefs[i];

  // Drop shadow
  fillEllipse(cx, dy + 7, rx, ry, ...shad);

  // Main disc — two-tone average for a flat-but-soft look
  const midR = Math.round((colTop[0] + colBot[0]) / 2);
  const midG = Math.round((colTop[1] + colBot[1]) / 2);
  const midB = Math.round((colTop[2] + colBot[2]) / 2);
  fillEllipse(cx, dy, rx, ry, midR, midG, midB);

  // Highlight (lighter ellipse offset upward) — uses highlight color tuple
  fillEllipse(cx - 8, dy - Math.round(ry * 0.32), Math.round(rx * 0.62), Math.round(ry * 0.36),
    hl[0], hl[1], hl[2], hl[3]);
}

// ── PNG encoder ──────────────────────────────────────────────────────────────

function crc32(data) {
  let c = 0xFFFFFFFF;
  for (const b of data) c = (((c >>> 8) ^ (c ^ b) & 0xFF) >>> 0) ^ (0xEDB88320 & (-(((c ^ b) & 1))) >>> 0);
  // proper table-based CRC32
  return c; // will use the real impl below
}

// Proper CRC32 table
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function realCrc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const crcInput  = Buffer.concat([typeBytes, data]);
  const out = Buffer.allocUnsafe(4 + 4 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  typeBytes.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(realCrc32(crcInput), 8 + data.length);
  return out;
}

const ihdr = Buffer.allocUnsafe(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8]  = 8; // bit depth
ihdr[9]  = 6; // RGBA
ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

// Build raw scanlines (filter byte 0 per row)
const raw = Buffer.allocUnsafe(SIZE * (1 + SIZE * 4));
for (let y = 0; y < SIZE; y++) {
  raw[y * (1 + SIZE * 4)] = 0;
  Buffer.from(buf.buffer, y * SIZE * 4, SIZE * 4).copy(raw, y * (1 + SIZE * 4) + 1);
}

const compressed = zlib.deflateSync(raw, { level: 9 });

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', compressed),
  chunk('IEND', Buffer.alloc(0)),
]);

const outPath = path.join(__dirname, '..', 'assets', 'icon.png');
fs.writeFileSync(outPath, png);
console.log(`Written ${png.length} bytes → ${outPath}`);
