import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import opentype from 'opentype.js';
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const svgPath = join(here, 'icon.svg');
const pngPath = join(here, 'icon.png');
const icnsPath = join(here, 'icon.icns');
const icoPath = join(here, 'icon.ico');
const iconsetDir = join(here, 'icon.iconset');
const fontPath = join(here, 'DMSerifDisplay-Regular.ttf');

// ---- 1) Ensure DM Serif Display font file is available ----
if (!existsSync(fontPath)) {
  const url = 'https://github.com/google/fonts/raw/main/ofl/dmserifdisplay/DMSerifDisplay-Regular.ttf';
  console.log(`[icons] fetching ${url}`);
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`font download failed: ${resp.status} ${resp.statusText}`);
  }
  const buf = Buffer.from(await resp.arrayBuffer());
  writeFileSync(fontPath, buf);
  console.log(`[icons] wrote ${fontPath} (${buf.length} bytes)`);
}

// ---- 2) Extract "V" glyph as an SVG path, centered in 1024x1024 ----
const font = opentype.loadSync(fontPath);
const CANVAS = 1024;
const FONT_SIZE = 760;
const probe = font.getPath('V', 0, 0, FONT_SIZE);
const bb = probe.getBoundingBox();
const glyphW = bb.x2 - bb.x1;
const glyphH = bb.y2 - bb.y1;
const offsetX = (CANVAS - glyphW) / 2 - bb.x1;
// Optical centering: serif V has weight at bottom, nudge up slightly
const opticalShift = -18;
const offsetY = (CANVAS - glyphH) / 2 - bb.y1 + opticalShift;
const vPath = font.getPath('V', offsetX, offsetY, FONT_SIZE).toPathData(3);

// ---- 3) Compose icon.svg ----
const svg = `<svg width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1a1a2e"/>
      <stop offset="0.55" stop-color="#14142a"/>
      <stop offset="1" stop-color="#0b0b12"/>
    </linearGradient>
    <radialGradient id="wash" cx="0.5" cy="0.35" r="0.8">
      <stop offset="0" stop-color="#2e3352" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#2e3352" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${CANVAS}" height="${CANVAS}" rx="224" ry="224" fill="url(#bg)"/>
  <rect width="${CANVAS}" height="${CANVAS}" rx="224" ry="224" fill="url(#wash)"/>

  <path d="M 224 92 L 800 92" stroke="rgba(255,255,255,0.06)" stroke-width="1" fill="none"/>

  <path d="${vPath}" fill="#f2f2f5"/>

  <rect x="0.5" y="0.5" width="${CANVAS - 1}" height="${CANVAS - 1}" rx="223.5" ry="223.5"
        fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
</svg>
`;
writeFileSync(svgPath, svg);
console.log(`[icons] wrote ${svgPath}`);

// ---- 4) Master 1024x1024 PNG ----
await sharp(Buffer.from(svg))
  .resize(1024, 1024)
  .png()
  .toFile(pngPath);
console.log(`[icons] wrote ${pngPath}`);

// ---- 5) .icns via iconutil (macOS) ----
const icnsSpec = [
  { size: 16,   name: 'icon_16x16.png' },
  { size: 32,   name: 'icon_16x16@2x.png' },
  { size: 32,   name: 'icon_32x32.png' },
  { size: 64,   name: 'icon_32x32@2x.png' },
  { size: 128,  name: 'icon_128x128.png' },
  { size: 256,  name: 'icon_128x128@2x.png' },
  { size: 256,  name: 'icon_256x256.png' },
  { size: 512,  name: 'icon_256x256@2x.png' },
  { size: 512,  name: 'icon_512x512.png' },
  { size: 1024, name: 'icon_512x512@2x.png' },
];
rmSync(iconsetDir, { recursive: true, force: true });
mkdirSync(iconsetDir, { recursive: true });
for (const { size, name } of icnsSpec) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(iconsetDir, name));
}
try {
  execSync(`iconutil -c icns -o "${icnsPath}" "${iconsetDir}"`, { stdio: 'inherit' });
  console.log(`[icons] wrote ${icnsPath}`);
} catch (err) {
  console.warn('[icons] iconutil failed — .icns not generated. Are you on macOS?');
}
rmSync(iconsetDir, { recursive: true, force: true });

// ---- 6) .ico (multi-size) ----
const icoSizes = [16, 24, 32, 48, 64, 128, 256];
const icoBuffers = await Promise.all(
  icoSizes.map((size) =>
    sharp(Buffer.from(svg)).resize(size, size).png().toBuffer()
  )
);
writeFileSync(icoPath, await pngToIco(icoBuffers));
console.log(`[icons] wrote ${icoPath}`);

console.log('[icons] done.');
