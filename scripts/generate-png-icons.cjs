const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function createPng(width, height, isMaskable = false) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // no interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw image data with filter byte at start of each scanline
  const scanlineWidth = width * 4;
  const rawData = Buffer.alloc((1 + scanlineWidth) * height);

  const cx = width / 2;
  const cy = height / 2;
  const outerR = width * 0.46; // for rounded circle / badge

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + scanlineWidth);
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const px = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Emerald background: #047857 (4, 120, 87)
      let r = 4, g = 120, b = 87, a = 255;

      if (!isMaskable) {
        // Smooth rounded squircle badge for non-maskable icons
        const cornerDist = Math.max(Math.abs(dx), Math.abs(dy));
        if (cornerDist > width * 0.48) {
          a = 0; // transparent corners
        }
      }

      // Draw Yen Symbol '¥' in gold & white in the center
      // Center scale factor
      const scale = width / 120;
      const nx = dx / scale;
      const ny = dy / scale;

      // Vertical stem of Yen: nx between -3 and 3, ny between -22 and 22
      const isStem = Math.abs(nx) <= 3 && ny >= -8 && ny <= 26;
      
      // Upper diagonal arms of 'V'
      const isLeftArm = ny < -6 && ny > -28 && Math.abs((ny + 28) * 0.8 - (-nx - 6)) < 3.8;
      const isRightArm = ny < -6 && ny > -28 && Math.abs((ny + 28) * 0.8 - (nx - 6)) < 3.8;
      
      // Two horizontal crossbars
      const isUpperBar = ny >= 2 && ny <= 5 && Math.abs(nx) <= 18;
      const isLowerBar = ny >= 12 && ny <= 15 && Math.abs(nx) <= 18;

      // Small coin ring around it
      const ringDist = Math.sqrt(nx * nx + ny * ny);
      const isCoinRing = ringDist >= 36 && ringDist <= 38.5;

      if (isStem || isLeftArm || isRightArm || isUpperBar || isLowerBar) {
        // Pure crisp white symbol
        r = 255; g = 255; b = 255; a = 255;
      } else if (isCoinRing) {
        // Gold accent ring (#F59E0B)
        r = 245; g = 158; b = 11; a = 255;
      } else {
        // Subtle gradient on emerald background
        const grad = Math.min(1, dist / (width * 0.6));
        r = Math.round(5 + grad * 12);
        g = Math.round(150 - grad * 35);
        b = Math.round(105 - grad * 25);
      }

      rawData[px] = r;
      rawData[px + 1] = g;
      rawData[px + 2] = b;
      rawData[px + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate PWA Icons
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPng(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, true));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPng(64, 64, false));

// Also write crisp SVG brand icon
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="emGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10B981" />
      <stop offset="100%" stop-color="#047857" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="128" fill="url(#emGrad)" />
  <circle cx="256" cy="256" r="180" stroke="#F59E0B" stroke-width="8" stroke-dasharray="16 12" fill="none" opacity="0.8" />
  <!-- Yen Symbol -->
  <path d="M160 140 L256 260 L352 140" stroke="#FFFFFF" stroke-width="32" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  <line x1="256" y1="260" x2="256" y2="400" stroke="#FFFFFF" stroke-width="32" stroke-linecap="round" />
  <line x1="176" y1="290" x2="336" y2="290" stroke="#FFFFFF" stroke-width="28" stroke-linecap="round" />
  <line x1="176" y1="340" x2="336" y2="340" stroke="#FFFFFF" stroke-width="28" stroke-linecap="round" />
  <!-- Cute companion star -->
  <polygon points="380,120 388,140 408,148 388,156 380,176 372,156 352,148 372,140" fill="#FDE68A" />
</svg>`;
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svg, 'utf8');

console.log('All PWA PNG and SVG icons generated successfully!');
