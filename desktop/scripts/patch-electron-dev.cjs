const fs = require('fs');
const path = require('path');

function patchElectronDev() {
  if (process.platform !== 'darwin') return;

  const electronAppDir = path.join(__dirname, '../node_modules/electron/dist/Electron.app');
  if (!fs.existsSync(electronAppDir)) return;

  // 1. Patch Info.plist
  const plistPath = path.join(electronAppDir, 'Contents/Info.plist');
  if (fs.existsSync(plistPath)) {
    try {
      let plist = fs.readFileSync(plistPath, 'utf8');
      plist = plist.replace(/<key>CFBundleDisplayName<\/key>\s*<string>[^<]*<\/string>/, '<key>CFBundleDisplayName</key>\n\t<string>Lumora (Dev)</string>');
      plist = plist.replace(/<key>CFBundleName<\/key>\s*<string>[^<]*<\/string>/, '<key>CFBundleName</key>\n\t<string>Lumora (Dev)</string>');
      fs.writeFileSync(plistPath, plist, 'utf8');
      console.log('✓ Patched Electron.app Info.plist with app name "Lumora (Dev)"');
    } catch (e) {
      console.warn('Could not patch Info.plist:', e.message);
    }
  }


  // 2. Replace electron.icns with Lumora icon.icns
  const srcIcns = path.join(__dirname, '../build/icon.icns');
  const destIcns = path.join(electronAppDir, 'Contents/Resources/electron.icns');
  if (fs.existsSync(srcIcns)) {
    try {
      fs.copyFileSync(srcIcns, destIcns);
      console.log('✓ Replaced Electron.app default dock icon with Lumora icon');
    } catch (e) {
      console.warn('Could not copy icon.icns:', e.message);
    }
  }
}

patchElectronDev();
