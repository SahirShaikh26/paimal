// Generates required Expo asset PNGs using only Node.js built-ins
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function makePNG(width, height, r, g, b) {
  // PNG signature
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Raw image data: each row = filter(0) + RGB pixels
  const rowSize = 1 + width * 3;
  const raw = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y++) {
    const offset = y * rowSize;
    raw[offset] = 0; // filter type None
    for (let x = 0; x < width; x++) {
      raw[offset + 1 + x * 3 + 0] = r;
      raw[offset + 1 + x * 3 + 1] = g;
      raw[offset + 1 + x * 3 + 2] = b;
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 1 });

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeB = Buffer.from(type, 'ascii');
    const crc = crc32(Buffer.concat([typeB, data]));
    const crcB = Buffer.alloc(4);
    crcB.writeUInt32BE(crc >>> 0);
    return Buffer.concat([len, typeB, data, crcB]);
  }

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// CRC-32 implementation
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir);

// icon.png — 1024x1024 deep blue
fs.writeFileSync(path.join(assetsDir, 'icon.png'), makePNG(1024, 1024, 37, 99, 235));
console.log('✓ icon.png (1024x1024)');

// adaptive-icon.png — 1024x1024 white (foreground on colored background)
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), makePNG(1024, 1024, 255, 255, 255));
console.log('✓ adaptive-icon.png (1024x1024)');

// splash.png — 1284x2778 deep blue
fs.writeFileSync(path.join(assetsDir, 'splash.png'), makePNG(1284, 2778, 30, 58, 95));
console.log('✓ splash.png (1284x2778)');

// favicon.png — 48x48
fs.writeFileSync(path.join(assetsDir, 'favicon.png'), makePNG(48, 48, 37, 99, 235));
console.log('✓ favicon.png (48x48)');

console.log('\nAll assets generated in mobile/assets/');
