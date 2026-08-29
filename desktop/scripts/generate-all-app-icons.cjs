const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const buildDir = path.join(__dirname, '../build');
const publicDir = path.join(__dirname, '../public');

if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

const ICONS = {
  dark: {
    name: 'Midnight Dark',
    svg: `<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#141722" />
      <stop offset="50%" stop-color="#0b0d13" />
      <stop offset="100%" stop-color="#040507" />
    </linearGradient>
    <linearGradient id="whitePillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#e2e8f0" />
    </linearGradient>
    <linearGradient id="bluePillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#60a5fa" />
      <stop offset="100%" stop-color="#2563eb" />
    </linearGradient>
    <linearGradient id="blueDotGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#60a5fa" />
      <stop offset="100%" stop-color="#3b82f6" />
    </linearGradient>
  </defs>
  <rect x="32" y="32" width="960" height="960" rx="224" fill="url(#bgGrad)" stroke="#232838" stroke-width="8" />
  <rect x="36" y="36" width="952" height="952" rx="220" fill="none" stroke="rgba(255, 255, 255, 0.08)" stroke-width="4" />
  <rect x="274" y="270" width="180" height="484" rx="90" fill="url(#whitePillGrad)" />
  <circle cx="684" cy="270" r="70" fill="url(#blueDotGrad)" />
  <rect x="594" y="384" width="180" height="370" rx="90" fill="url(#bluePillGrad)" />
</svg>`,
  },
  light: {
    name: 'Studio Light',
    svg: `<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradLight" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="60%" stop-color="#f8fafc" />
      <stop offset="100%" stop-color="#e2e8f0" />
    </linearGradient>
    <linearGradient id="darkPillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <linearGradient id="lightBluePillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6" />
      <stop offset="100%" stop-color="#1d4ed8" />
    </linearGradient>
    <linearGradient id="lightBlueDotGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#60a5fa" />
      <stop offset="100%" stop-color="#2563eb" />
    </linearGradient>
    <filter id="pillShadow" x="-10%" y="-10%" width="130%" height="130%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#0f172a" flood-opacity="0.1" />
    </filter>
  </defs>
  <rect x="32" y="32" width="960" height="960" rx="224" fill="url(#bgGradLight)" stroke="#cbd5e1" stroke-width="8" />
  <rect x="36" y="36" width="952" height="952" rx="220" fill="none" stroke="rgba(255, 255, 255, 0.9)" stroke-width="4" />
  <g filter="url(#pillShadow)">
    <rect x="274" y="270" width="180" height="484" rx="90" fill="url(#darkPillGrad)" />
  </g>
  <g filter="url(#pillShadow)">
    <circle cx="684" cy="270" r="70" fill="url(#lightBlueDotGrad)" />
  </g>
  <g filter="url(#pillShadow)">
    <rect x="594" y="384" width="180" height="370" rx="90" fill="url(#lightBluePillGrad)" />
  </g>
</svg>`,
  },
  liquid_glass: {
    name: 'Liquid Glass',
    svg: `<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="glassBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#182234" />
      <stop offset="45%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#080c14" />
    </linearGradient>
    <linearGradient id="iridescentBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.85" />
      <stop offset="35%" stop-color="#c084fc" stop-opacity="0.65" />
      <stop offset="70%" stop-color="#38bdf8" stop-opacity="0.75" />
      <stop offset="100%" stop-color="#818cf8" stop-opacity="0.85" />
    </linearGradient>
    <linearGradient id="glassSheen" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.32" />
      <stop offset="40%" stop-color="#ffffff" stop-opacity="0.08" />
      <stop offset="70%" stop-color="#ffffff" stop-opacity="0" />
    </linearGradient>
    <linearGradient id="liquidWhitePill" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="50%" stop-color="#f1f5f9" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#cbd5e1" stop-opacity="0.7" />
    </linearGradient>
    <linearGradient id="liquidBluePill" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#67e8f9" />
      <stop offset="30%" stop-color="#38bdf8" />
      <stop offset="70%" stop-color="#3b82f6" />
      <stop offset="100%" stop-color="#1d4ed8" />
    </linearGradient>
    <filter id="glassBloom" x="-30%" y="-30%" width="160%" height="160%" filterUnits="userSpaceOnUse">
      <feGaussianBlur stdDeviation="32" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <rect x="32" y="32" width="960" height="960" rx="224" fill="url(#glassBg)" stroke="url(#iridescentBorder)" stroke-width="10" />
  <path d="M 32 256 C 32 132 132 32 256 32 L 768 32 C 892 32 992 132 992 256 L 992 480 C 800 520 400 440 32 580 Z" fill="url(#glassSheen)" />
  <rect x="38" y="38" width="948" height="948" rx="218" fill="none" stroke="rgba(255, 255, 255, 0.2)" stroke-width="3" />
  <circle cx="512" cy="512" r="280" fill="#3b82f6" fill-opacity="0.22" filter="url(#glassBloom)" />
  <circle cx="684" cy="380" r="160" fill="#818cf8" fill-opacity="0.25" filter="url(#glassBloom)" />
  <rect x="274" y="270" width="180" height="484" rx="90" fill="url(#liquidWhitePill)" stroke="rgba(255, 255, 255, 0.6)" stroke-width="6" />
  <rect x="286" y="282" width="156" height="200" rx="78" fill="none" stroke="rgba(255, 255, 255, 0.6)" stroke-width="2" stroke-dasharray="80 120" />
  <circle cx="684" cy="270" r="70" fill="url(#liquidBluePill)" stroke="rgba(255, 255, 255, 0.6)" stroke-width="5" />
  <rect x="594" y="384" width="180" height="370" rx="90" fill="url(#liquidBluePill)" stroke="rgba(255, 255, 255, 0.5)" stroke-width="6" />
  <path d="M 120 900 C 300 970 724 970 904 900" stroke="rgba(255, 255, 255, 0.15)" stroke-width="4" stroke-linecap="round" />
</svg>`,
  },
};

async function renderAll() {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();

  for (const [key, icon] of Object.entries(ICONS)) {
    const svgPath = path.join(buildDir, `icon-${key}.svg`);
    fs.writeFileSync(svgPath, icon.svg);

    const page = await browser.newPage({
      viewport: { width: 1024, height: 1024 },
      deviceScaleFactor: 1,
    });

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 1024px;
      height: 1024px;
      background: transparent !important;
      overflow: hidden;
    }
  </style>
</head>
<body>
${icon.svg}
</body>
</html>`;

    await page.setContent(htmlContent);
    const buildPng = path.join(buildDir, `icon-${key}.png`);
    const publicPng = path.join(publicDir, `icon-${key}.png`);

    await page.screenshot({
      path: buildPng,
      omitBackground: true,
      type: 'png',
    });

    fs.copyFileSync(buildPng, publicPng);
    console.log(`✓ Rendered 1024x1024 transparent ${icon.name} icon -> build/icon-${key}.png & public/icon-${key}.png`);
    await page.close();
  }

  // Ensure default icon.png is dark
  fs.copyFileSync(path.join(buildDir, 'icon-dark.png'), path.join(buildDir, 'icon.png'));
  fs.copyFileSync(path.join(buildDir, 'icon-dark.png'), path.join(publicDir, 'icon.png'));

  await browser.close();
  console.log('✓ All 3 App Icons generated successfully!');
}

renderAll().catch(err => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
