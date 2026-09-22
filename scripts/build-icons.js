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
 * Packs PNG buffer into standard Windows .ICO format
 */
function pngToIco(pngBuffer, size = 64) {
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // Reserved
  icoHeader.writeUInt16LE(1, 2); // Type: 1 = ICO
  icoHeader.writeUInt16LE(1, 4); // Count = 1 image

  const dirEntry = Buffer.alloc(16);
  dirEntry.writeUInt8(size >= 256 ? 0 : size, 0); // Width
  dirEntry.writeUInt8(size >= 256 ? 0 : size, 1); // Height
  dirEntry.writeUInt8(0, 2); // Color palette
  dirEntry.writeUInt8(0, 3); // Reserved
  dirEntry.writeUInt16LE(1, 4); // Color planes
  dirEntry.writeUInt16LE(32, 6); // Bits per pixel
  dirEntry.writeUInt32LE(pngBuffer.length, 8); // Size
  dirEntry.writeUInt32LE(22, 12); // Offset

  return Buffer.concat([icoHeader, dirEntry, pngBuffer]);
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

// Generate 64x64 & 32x32 crisp icons
const png64 = generateFreeWisprIcon(64);
const png32 = generateFreeWisprIcon(32);
const ico64 = pngToIco(png64, 64);

// Write to files
fs.writeFileSync(path.join(buildDir, 'icon.ico'), ico64);
fs.writeFileSync(path.join(publicDir, 'icon.ico'), ico64);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), ico64);
fs.writeFileSync(path.join(electronDir, 'icon.png'), png64);
fs.writeFileSync(path.join(electronDir, 'tray-icon.png'), png32);
fs.writeFileSync(path.join(publicDir, 'icon.png'), png64);

console.log('✅ Generated High-Definition Icons:');
console.log(' - electron/icon.png (64x64)');
console.log(' - electron/tray-icon.png (32x32)');
console.log(' - build/icon.ico (Windows executable icon)');
