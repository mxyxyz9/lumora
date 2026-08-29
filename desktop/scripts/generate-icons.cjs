const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const buildDir = path.join(__dirname, '../build');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// 1. High quality 1024x1024 SVG of the Lumora icon (bright white & electric blue emblem on deep squircle)
const svgContent = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
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

  <!-- macOS App Squircle Base -->
  <rect x="32" y="32" width="960" height="960" rx="224" fill="url(#bgGrad)" stroke="#232838" stroke-width="8" />

  <!-- Inner Soft Bevel Highlight -->
  <rect x="36" y="36" width="952" height="952" rx="220" fill="none" stroke="rgba(255, 255, 255, 0.08)" stroke-width="4" />

  <!-- Left White Luminous Pill -->
  <rect x="274" y="270" width="180" height="484" rx="90" fill="url(#whitePillGrad)" />

  <!-- Right Blue Harmonic Dot -->
  <circle cx="684" cy="270" r="70" fill="url(#blueDotGrad)" />

  <!-- Right Blue Pill -->
  <rect x="594" y="384" width="180" height="370" rx="90" fill="url(#bluePillGrad)" />
</svg>`;

const svgPath = path.join(buildDir, 'icon.svg');
fs.writeFileSync(svgPath, svgContent);
console.log('✓ Wrote build/icon.svg');

// 2. Render SVG to 1024x1024 PNG with 100% TRANSPARENT ALPHA BACKGROUND using Playwright
async function generateIcons() {
  const iconsetDir = path.join(buildDir, 'icon.iconset');
  if (fs.existsSync(iconsetDir)) {
    fs.rmSync(iconsetDir, { recursive: true, force: true });
  }
  fs.mkdirSync(iconsetDir, { recursive: true });

  const masterPng = path.join(buildDir, 'icon.png');

  try {
    const { chromium } = require('playwright');
    const browser = await chromium.launch();
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
${svgContent}
</body>
</html>`;

    await page.setContent(htmlContent);
    await page.screenshot({
      path: masterPng,
      omitBackground: true,
      type: 'png',
    });
    await browser.close();
    console.log('✓ Rendered master icon.png with 100% transparent background');

    // Generate iconset sizes
    const sizes = [
      { name: 'icon_16x16.png', size: 16 },
      { name: 'icon_16x16@2x.png', size: 32 },
      { name: 'icon_32x32.png', size: 32 },
      { name: 'icon_32x32@2x.png', size: 64 },
      { name: 'icon_128x128.png', size: 128 },
      { name: 'icon_128x128@2x.png', size: 256 },
      { name: 'icon_256x256.png', size: 256 },
      { name: 'icon_256x256@2x.png', size: 512 },
      { name: 'icon_512x512.png', size: 512 },
      { name: 'icon_512x512@2x.png', size: 1024 },
    ];

    for (const s of sizes) {
      const dest = path.join(iconsetDir, s.name);
      execSync(`sips -z ${s.size} ${s.size} "${masterPng}" --out "${dest}"`, { stdio: 'pipe' });
    }

    // Create icon.icns with iconutil
    const icnsPath = path.join(buildDir, 'icon.icns');
    execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`, { stdio: 'pipe' });
    console.log('✓ Generated build/icon.icns and build/icon.png with transparent corners');

    // Clean up iconset folder
    fs.rmSync(iconsetDir, { recursive: true, force: true });
  } catch (err) {
    console.error('Error during icon generation:', err);
  }
}

generateIcons();
