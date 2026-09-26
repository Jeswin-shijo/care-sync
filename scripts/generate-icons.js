#!/usr/bin/env node

/**
 * Renders every CareSync icon asset from the vector mark in
 * src/constants/brandLogo.ts, using headless Google Chrome as the rasteriser.
 *
 *   node scripts/generate-icons.js
 *
 * After running, rebuild the native app so the launcher icon updates:
 *   npx expo prebuild -p android && npx expo run:android
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');
const CHROME =
  process.env.CHROME_PATH ||
  ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) =>
    fs.existsSync(p)
  );

if (!CHROME) {
  console.error('Google Chrome not found — set CHROME_PATH to a Chrome/Chromium binary.');
  process.exit(1);
}

process.removeAllListeners('warning');
const { buildLogoSvg } = require(path.join(ROOT, 'src/constants/brandLogo.ts'));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'caresync-icons-'));

const render = (file, size, options) => {
  const svgPath = path.join(tmp, `${file}.svg`);
  fs.writeFileSync(svgPath, buildLogoSvg({ size, ...options }));
  const out = path.join(ASSETS, file);
  execFileSync(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--default-background-color=00000000',
      `--window-size=${size},${size}`,
      `--screenshot=${out}`,
      `file://${svgPath}`,
    ],
    { stdio: 'ignore' }
  );
  console.log(`✔ assets/${file} (${size}×${size})`);
};

// iOS / default app icon: full-bleed square tile (the OS applies its own mask).
render('icon.png', 1024, { cornerRadius: 0 });
// Android adaptive icon layers (108dp canvas; mark scaled to 0.78 so the arrow and sparkle stay inside the 66dp safe zone).
render('android-icon-background.png', 1024, { mark: false });
render('android-icon-foreground.png', 1024, { background: false, markScale: 0.78 });
render('android-icon-monochrome.png', 1024, { background: false, markScale: 0.78, monochrome: true });
// Splash, in-app logo and web favicon: rounded tile with transparent corners.
render('splash-icon.png', 1024, { cornerRadius: 230 });
render('logo.png', 512, { cornerRadius: 230 });
render('favicon.png', 48, { cornerRadius: 230, shadow: false });

fs.rmSync(tmp, { recursive: true, force: true });
