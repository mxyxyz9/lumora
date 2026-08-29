const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const buildDir = path.join(__dirname, '../build');
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }

  // Use HTML5 Canvas 2D to render a 100% deterministic, bright, vibrant, transparent icon
  const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; }
    body { background: transparent; overflow: hidden; }
    canvas { display: block; }
  </style>
</head>
<body>
  <canvas id="c" width="1024" height="1024"></canvas>
  <script>
    const canvas = document.getElementById('c');
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 1024, 1024);

    // 1. Draw macOS Squircle Base with smooth anti-aliasing
    const sx = 54, sy = 54, sw = 916, sh = 916, sr = 216;
    
    // Squircle background gradient
    const bgGrad = ctx.createLinearGradient(0, sy, 0, sy + sh);
    bgGrad.addColorStop(0, '#1c1f2b');
    bgGrad.addColorStop(0.4, '#10131b');
    bgGrad.addColorStop(1, '#080a0f');

    ctx.beginPath();
    ctx.roundRect(sx, sy, sw, sh, sr);
    ctx.fillStyle = bgGrad;
    ctx.fill();

    // Subtle 1.5px inner highlight ring
    ctx.beginPath();
    ctx.roundRect(sx, sy, sw, sh, sr);
    const borderGrad = ctx.createLinearGradient(0, sy, 0, sy + sh);
    borderGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
    borderGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.06)');
    borderGrad.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 5;
    ctx.stroke();

    // 2. Subtle drop shadow for the Kanso mark
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 36;
    ctx.shadowOffsetY = 16;

    // 3. Left Solid Silver-White Pillar
    const lx = 246, ly = 250, lw = 184, lh = 524, lr = 92;
    const silverGrad = ctx.createLinearGradient(lx, ly, lx, ly + lh);
    silverGrad.addColorStop(0, '#ffffff');
    silverGrad.addColorStop(0.6, '#f1f5f9');
    silverGrad.addColorStop(1, '#cbd5e1');

    ctx.beginPath();
    ctx.roundRect(lx, ly, lw, lh, lr);
    ctx.fillStyle = silverGrad;
    ctx.fill();

    // 4. Right Blue Harmonic Dot
    const dotCx = 654, dotCy = 268, dotR = 80;
    const dotGrad = ctx.createLinearGradient(dotCx - dotR, dotCy - dotR, dotCx + dotR, dotCy + dotR);
    dotGrad.addColorStop(0, '#93c5fd');
    dotGrad.addColorStop(0.4, '#60a5fa');
    dotGrad.addColorStop(1, '#3b82f6');

    ctx.beginPath();
    ctx.arc(dotCx, dotCy, dotR, 0, Math.PI * 2);
    ctx.fillStyle = dotGrad;
    ctx.fill();

    // 5. Right Blue Pillar Body
    const rx = 562, ry = 394, rw = 184, rh = 380, rr = 92;
    const blueGrad = ctx.createLinearGradient(rx, ry, rx, ry + rh);
    blueGrad.addColorStop(0, '#60a5fa');
    blueGrad.addColorStop(0.5, '#3b82f6');
    blueGrad.addColorStop(1, '#2563eb');

    ctx.beginPath();
    ctx.roundRect(rx, ry, rw, rh, rr);
    ctx.fillStyle = blueGrad;
    ctx.fill();
  </script>
</body>
</html>`;

  const win = new BrowserWindow({
    width: 1024,
    height: 1024,
    show: false,
    transparent: true,
    frame: false,
    webPreferences: {
      offscreen: true,
    },
  });

  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  win.webContents.on('did-finish-load', async () => {
    await new Promise(r => setTimeout(r, 400));
    const image = await win.webContents.capturePage({ x: 0, y: 0, width: 1024, height: 1024 });
    const pngBuffer = image.toPNG();
    const masterPng = path.join(buildDir, 'icon.png');
    fs.writeFileSync(masterPng, pngBuffer);
    console.log('✓ Rendered bright, vibrant transparent 1024x1024 PNG');

    // Create macOS iconset
    const iconsetDir = path.join(buildDir, 'icon.iconset');
    if (fs.existsSync(iconsetDir)) fs.rmSync(iconsetDir, { recursive: true, force: true });
    fs.mkdirSync(iconsetDir, { recursive: true });

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

    const icnsPath = path.join(buildDir, 'icon.icns');
    execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`, { stdio: 'pipe' });
    console.log('✓ Generated crisp, high-resolution build/icon.icns');

    fs.rmSync(iconsetDir, { recursive: true, force: true });

    // Copy into Electron.app in node_modules
    const electronAppDir = path.join(__dirname, '../node_modules/electron/dist/Electron.app');
    const destIcns = path.join(electronAppDir, 'Contents/Resources/electron.icns');
    if (fs.existsSync(destIcns)) {
      fs.copyFileSync(icnsPath, destIcns);
      console.log('✓ Updated Electron.app Resources/electron.icns');
    }

    app.quit();
  });
});
