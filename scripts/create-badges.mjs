import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'apps', 'web', 'public');
const logosDir = path.join(publicDir, 'images', 'logos');
const outputDir = path.join(publicDir, 'images', 'channels');

fs.mkdirSync(outputDir, { recursive: true });

const WIDTH = 600;
const HEIGHT = 200;

const channels = [
  { name: 'wccg-badge', logo: 'wccg-logo.png', color: '#ef4444' },
  { name: 'soul-badge', logo: 'soul-1045-logo.png', color: '#a855f7' },
  { name: 'hot-badge', logo: 'hot-1045-logo.png', color: '#eab308' },
  { name: 'vibe-badge', logo: 'the-vibe-logo.png', color: '#3b82f6' },
];

for (const ch of channels) {
  const logoPath = path.join(logosDir, ch.logo);
  const logoData = fs.readFileSync(logoPath);
  const logoBase64 = logoData.toString('base64');
  const logoMime = 'image/png';

  const svg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <clipPath id="outer">
      <rect width="${WIDTH}" height="${HEIGHT}" rx="16" />
    </clipPath>
  </defs>
  <g clip-path="url(#outer)">
    <!-- Colored background -->
    <rect width="${WIDTH}" height="${HEIGHT}" fill="${ch.color}" />
    <!-- Tilted white card -->
    <g transform="rotate(-6, ${WIDTH * 0.65}, ${HEIGHT / 2})">
      <rect x="${WIDTH * 0.25}" y="-30" width="${WIDTH * 0.85}" height="${HEIGHT + 60}" rx="20" fill="white" />
    </g>
    <!-- Logo -->
    <image href="data:${logoMime};base64,${logoBase64}"
           x="${WIDTH * 0.35}" y="${HEIGHT * 0.1}"
           width="${WIDTH * 0.55}" height="${HEIGHT * 0.8}"
           preserveAspectRatio="xMidYMid meet" />
  </g>
</svg>`;

  fs.writeFileSync(path.join(outputDir, `${ch.name}.svg`), svg);
  console.log(`Created ${ch.name}.svg`);
}

console.log('All badges created!');
