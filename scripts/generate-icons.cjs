const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Create PNG buffer from RGBA pixel callback
function createPNG(width, height, getPixelRGBA) {
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixelRGBA(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData, { level: 9 });

  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[i] = c;
  }

  function crc32(buf, offset, length) {
    let crc = 0xffffffff;
    for (let i = offset; i < offset + length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = data.length;
    const chunk = Buffer.alloc(12 + len);
    chunk.writeUInt32BE(len, 0);
    chunk.write(type, 4, 4, 'ascii');
    data.copy(chunk, 8);
    const crc = crc32(chunk, 4, 4 + len);
    chunk.writeUInt32BE(crc, 8 + len);
    return chunk;
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA color type
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressedData),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// Alpha blend helper: src over dst
function blend(dst, src) {
  const [dr, dg, db, da] = dst;
  const [sr, sg, sb, sa] = src;
  const saF = sa / 255;
  const daF = da / 255;
  const outA = saF + daF * (1 - saF);
  if (outA <= 0) return [0, 0, 0, 0];
  const outR = Math.round((sr * saF + dr * daF * (1 - saF)) / outA);
  const outG = Math.round((sg * saF + dg * daF * (1 - saF)) / outA);
  const outB = Math.round((sb * saF + db * daF * (1 - saF)) / outA);
  return [outR, outG, outB, Math.round(outA * 255)];
}

// Draw Orbit Icon function
function renderOrbitPixel(x, y, w, h, isMaskable) {
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background
  let baseColor = [0, 0, 0, 0];
  if (isMaskable) {
    // Luxury dark background #090d16 with subtle radial ambient indigo glow
    const normDist = dist / (w * 0.7);
    const bgFactor = Math.max(0, 1 - normDist);
    const r = Math.round(9 + 25 * bgFactor);
    const g = Math.round(13 + 15 * bgFactor);
    const b = Math.round(22 + 55 * bgFactor);
    baseColor = [r, g, b, 255];
  }

  // Circular Badge Radius
  // For maskable, safe zone radius is 0.35 * w. For standard, radius is 0.45 * w.
  const badgeR = isMaskable ? w * 0.36 : w * 0.44;

  // Anti-aliasing margin
  const aa = 1.2;

  // Circle Badge Mask
  const badgeDist = dist - badgeR;
  let badgeAlpha = 0;
  if (badgeDist < -aa) {
    badgeAlpha = 1;
  } else if (badgeDist < aa) {
    badgeAlpha = 0.5 - (badgeDist / (2 * aa));
  }

  if (badgeAlpha <= 0) {
    return baseColor;
  }

  // Badge gradient: #6366f1 (indigo) to #8b5cf6 (violet)
  // Angle roughly 45 degrees
  const gradPos = ((dx + dy) / (badgeR * 2) + 0.5);
  const t = Math.max(0, Math.min(1, gradPos));
  const gradR = Math.round(99 + (139 - 99) * t);
  const gradG = Math.round(102 + (92 - 102) * t);
  const gradB = Math.round(241 + (246 - 241) * t);
  const badgeColor = [gradR, gradG, gradB, Math.round(badgeAlpha * 255)];

  // Inside Badge: Draw Ring + 'O' Letter
  let fgColor = badgeColor;

  // Orbit Ellipse Ring
  // Tilted at ~ -30 degrees
  const angle = -0.55; // radians (~ -31.5 deg)
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const rotX = dx * cosA - dy * sinA;
  const rotY = dx * sinA + dy * cosA;

  const aSemi = badgeR * 0.82;
  const bSemi = badgeR * 0.32;
  // Ellipse distance approximation
  const ellDist = Math.abs(Math.sqrt((rotX / aSemi) ** 2 + (rotY / bSemi) ** 2) - 1.0) * bSemi;
  const ringThickness = badgeR * 0.055;
  if (ellDist < ringThickness + aa) {
    let ringAlpha = 0.5;
    if (ellDist > ringThickness - aa) {
      ringAlpha *= (1 - (ellDist - (ringThickness - aa)) / (2 * aa));
    }
    // Only upper/lower dash or semi-transparent glowing ring
    fgColor = blend(fgColor, [255, 255, 255, Math.round(ringAlpha * 180)]);
  }

  // Planetoid / Orbit particle at right edge of ellipse
  const pDx = rotX - aSemi * 0.95;
  const pDy = rotY - bSemi * 0.15;
  const pDist = Math.sqrt(pDx * pDx + pDy * pDy);
  const pR = badgeR * 0.09;
  if (pDist < pR + aa) {
    let pAlpha = 1;
    if (pDist > pR - aa) {
      pAlpha = 0.5 - ((pDist - pR) / (2 * aa));
    }
    fgColor = blend(fgColor, [255, 255, 255, Math.round(pAlpha * 255)]);
  }

  // Central Bold 'O'
  // Outer radius of 'O' ring and Inner radius
  const oOuterR = badgeR * 0.44;
  const oInnerR = badgeR * 0.25;

  let oAlpha = 0;
  if (dist <= oOuterR + aa && dist >= oInnerR - aa) {
    let aOuter = 1;
    if (dist > oOuterR - aa) {
      aOuter = 0.5 - ((dist - oOuterR) / (2 * aa));
    }
    let aInner = 1;
    if (dist < oInnerR + aa) {
      aInner = 0.5 + ((dist - oInnerR) / (2 * aa));
    }
    oAlpha = Math.max(0, Math.min(1, aOuter * aInner));
  }

  if (oAlpha > 0) {
    fgColor = blend(fgColor, [255, 255, 255, Math.round(oAlpha * 250)]);
  }

  return blend(baseColor, fgColor);
}

// Generate all required PWA icons
const outputDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const configs = [
  { name: 'icon-192.png', size: 192, maskable: false },
  { name: 'icon-512.png', size: 512, maskable: false },
  { name: 'icon-192-maskable.png', size: 192, maskable: true },
  { name: 'icon-512-maskable.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180, maskable: true },
  { name: 'icon-64.png', size: 64, maskable: false },
];

for (const cfg of configs) {
  console.log(`Generating ${cfg.name} (${cfg.size}x${cfg.size})...`);
  const png = createPNG(cfg.size, cfg.size, (x, y, w, h) =>
    renderOrbitPixel(x, y, w, h, cfg.maskable)
  );
  fs.writeFileSync(path.join(outputDir, cfg.name), png);
}

console.log('All icons generated successfully!');
