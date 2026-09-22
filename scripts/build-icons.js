const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/**
 * Creates a valid uncompressed PNG buffer from raw RGBA pixels
 */
function createPNG(width, height, rgbaBuffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit depth
  ihdrData.writeUInt8(6, 9); // RGBA color type
  ihdrData.writeUInt8(0, 10); // Compression method
  ihdrData.writeUInt8(0, 11); // Filter method
  ihdrData.writeUInt8(0, 12); // Interlace method
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Scanlines with filter byte 0 (None)
  const scanlines = Buffer.alloc(height * (width * 4 + 1));
  let srcOffset = 0;
  let dstOffset = 0;

  for (let y = 0; y < height; y++) {
    scanlines[dstOffset++] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      scanlines[dstOffset++] = rgbaBuffer[srcOffset++]; // R
      scanlines[dstOffset++] = rgbaBuffer[srcOffset++]; // G
      scanlines[dstOffset++] = rgbaBuffer[srcOffset++]; // B
      scanlines[dstOffset++] = rgbaBuffer[srcOffset++]; // A
    }
  }

  const compressed = zlib.deflateSync(scanlines);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4);
  data.copy(chunk, 8);
  const crc = crc32(chunk.slice(4, 8 + len));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// Simple CRC32 implementation
function crc32(buf) {
  let crc = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const crcTable = new Int32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[i] = c;
}

/**
 * Packs multiple PNG buffers into one standard multi-resolution Windows .ICO.
 * Windows Explorer and the taskbar require 16/24/32/48/64/128/256 sizes;
 * a single-size ICO often falls back to Electron's default icon.
 */
function pngsToIco(images) {
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // Reserved
  icoHeader.writeUInt16LE(1, 2); // Type: 1 = ICO
  icoHeader.writeUInt16LE(images.length, 4);

  const entries = [];
  let dataOffset = 6 + images.length * 16;

  for (const { size, png } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // No palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(dataOffset, 12);
    entries.push(entry);
    dataOffset += png.length;
  }

  return Buffer.concat([icoHeader, ...entries, ...images.map(({ png }) => png)]);
}

/**
 * Draws a vibrant 64x64 FreeWispr Icon (Purple glowing squircle + crisp white mic)
 */
function generateFreeWisprIcon(size = 64) {
  const rgba = Buffer.alloc(size * size * 4);

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.44;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Rounded Squircle / Circle background
      if (dist <= r) {
        // Violet gradient: #8B5CF6 to #6D28D9
        const t = y / size;
        const red = Math.round(139 * (1 - t) + 109 * t);
        const green = Math.round(92 * (1 - t) + 40 * t);
        const blue = Math.round(246 * (1 - t) + 217 * t);

        rgba[idx] = red;
        rgba[idx + 1] = green;
        rgba[idx + 2] = blue;
        rgba[idx + 3] = 255; // Full opacity
      } else if (dist <= r + 1.5) {
        // Antialiased border
        const alpha = Math.max(0, Math.min(255, Math.round((r + 1.5 - dist) * 255)));
        rgba[idx] = 139;
        rgba[idx + 1] = 92;
        rgba[idx + 2] = 246;
        rgba[idx + 3] = alpha;
      } else {
        // Transparent outside
        rgba[idx + 3] = 0;
      }

      // Draw crisp white microphone
      // 1. Mic capsule: x in [cx-4..cx+4], y in [cy-12..cy+2]
      const micW = size * 0.12;
      const micTop = cy - size * 0.22;
      const micBottom = cy + size * 0.05;

      if (x >= cx - micW && x <= cx + micW && y >= micTop && y <= micBottom) {
        const rad = micW;
        let inCap = false;
        if (y < micTop + rad) {
          const d = Math.sqrt((x - cx) ** 2 + (y - (micTop + rad)) ** 2);
          if (d <= rad) inCap = true;
        } else if (y > micBottom - rad) {
          const d = Math.sqrt((x - cx) ** 2 + (y - (micBottom - rad)) ** 2);
          if (d <= rad) inCap = true;
        } else {
          inCap = true;
        }

        if (inCap) {
          rgba[idx] = 255;
          rgba[idx + 1] = 255;
          rgba[idx + 2] = 255;
          rgba[idx + 3] = 255;
        }
      }

      // 2. Mic Stand Arc: semi-circle under capsule
      const arcR = size * 0.22;
      const arcCenterY = cy - size * 0.02;
      const arcDist = Math.sqrt((x - cx) ** 2 + (y - arcCenterY) ** 2);
      if (y >= arcCenterY && y <= arcCenterY + arcR + 2 && Math.abs(arcDist - arcR) <= size * 0.04) {
        rgba[idx] = 255;
        rgba[idx + 1] = 255;
        rgba[idx + 2] = 255;
        rgba[idx + 3] = 255;
      }

      // 3. Mic Stem & Base
      const stemTop = arcCenterY + arcR;
      const stemBottom = stemTop + size * 0.1;
      if (Math.abs(x - cx) <= size * 0.035 && y >= stemTop && y <= stemBottom) {
        rgba[idx] = 255;
        rgba[idx + 1] = 255;
        rgba[idx + 2] = 255;
        rgba[idx + 3] = 255;
      }

      // 4. Base bar
      const baseW = size * 0.16;
      if (Math.abs(x - cx) <= baseW && Math.abs(y - stemBottom) <= size * 0.035) {
        rgba[idx] = 255;
        rgba[idx + 1] = 255;
        rgba[idx + 2] = 255;
        rgba[idx + 3] = 255;
      }
    }
  }

  return createPNG(size, size, rgba);
}

// Ensure directories
const buildDir = path.join(__dirname, '../build');
const publicDir = path.join(__dirname, '../public');
const electronDir = path.join(__dirname, '../electron');

[buildDir, publicDir, electronDir].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// Generate a complete Windows icon set. The 256px PNG is also used by
// BrowserWindow so Windows never falls back to the Electron icon.
const windowsSizes = [16, 24, 32, 48, 64, 128, 256];
const iconImages = windowsSizes.map((size) => ({ size, png: generateFreeWisprIcon(size) }));
const iconBySize = Object.fromEntries(iconImages.map(({ size, png }) => [size, png]));
const windowsIco = pngsToIco(iconImages);

// Write the same branded artwork everywhere Electron/Windows may look.
fs.writeFileSync(path.join(buildDir, 'icon.ico'), windowsIco);
fs.writeFileSync(path.join(publicDir, 'icon.ico'), windowsIco);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), windowsIco);
fs.writeFileSync(path.join(electronDir, 'icon.png'), iconBySize[256]);
fs.writeFileSync(path.join(electronDir, 'tray-icon.png'), iconBySize[32]);
fs.writeFileSync(path.join(publicDir, 'icon.png'), iconBySize[256]);

console.log('✅ Generated FreeWispr multi-resolution Windows icons:');
console.log(` - build/icon.ico (${windowsSizes.join(', ')}px)`);
console.log(' - electron/icon.png (256x256)');
console.log(' - electron/tray-icon.png (32x32)');
