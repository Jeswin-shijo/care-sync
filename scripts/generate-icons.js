#!/usr/bin/env node

/**
 * Renders every icon of the MediOS apps from the vector mark in
 * src/constants/brandLogo.ts, using headless Google Chrome as the rasteriser:
 * this app's launcher, splash and in-app logo, and (when the web app sits next to
 * this repo, as ../hospital saas) the web favicon, logo and Apple touch icon.
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
const WEB_PUBLIC = path.resolve(ROOT, '../hospital saas/public');
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

const render = (file, size, options, dir = ASSETS) => {
  const svgPath = path.join(tmp, `${file}.svg`);
  fs.writeFileSync(svgPath, buildLogoSvg({ size, ...options }));
  const out = path.join(dir, file);
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
  console.log(`✔ ${path.relative(path.dirname(ROOT), out)} (${size}×${size})`);
};

const writeSvg = (file, options, dir) => {
  fs.writeFileSync(path.join(dir, file), `${buildLogoSvg(options)}\n`);
  console.log(`✔ ${path.relative(path.dirname(ROOT), path.join(dir, file))}`);
};

/** Rounded tile, as on the splash screen and in the apps' headers (~22% corners). */
const TILE = 225;

// iOS / default app icon: full-bleed square tile (the OS applies its own mask).
render('icon.png', 1024, { cornerRadius: 0 });
// Android adaptive icon layers (108dp canvas): the cross is scaled so its arm tips stay
// inside the 66dp safe circle that launcher masks never crop.
render('android-icon-background.png', 1024, { mark: false });
render('android-icon-foreground.png', 1024, { background: false, markScale: 0.86 });
render('android-icon-monochrome.png', 1024, { background: false, markScale: 0.86, monochrome: true });
// Splash, in-app logo and Expo web favicon: rounded tile with transparent corners.
render('splash-icon.png', 1024, { cornerRadius: TILE });
render('logo.png', 512, { cornerRadius: TILE });
render('favicon.png', 48, { cornerRadius: TILE, shadow: false, variant: 'small' });

// The web app (MediOS workstation) shares the mark.
if (fs.existsSync(WEB_PUBLIC)) {
  // Tabs show 16–32px: the heavier trace, no shadow.
  writeSvg('favicon.svg', { size: 64, cornerRadius: TILE, shadow: false, variant: 'small' }, WEB_PUBLIC);
  writeSvg('logo.svg', { size: 512, cornerRadius: TILE }, WEB_PUBLIC);
  // iOS home screen: full-bleed square (iOS rounds it); PNG for link previews.
  render('apple-touch-icon.png', 180, { cornerRadius: 0 }, WEB_PUBLIC);
  render('logo-512.png', 512, { cornerRadius: TILE }, WEB_PUBLIC);
} else {
  console.log(`(skipped web icons: ${WEB_PUBLIC} not found)`);
}

fs.rmSync(tmp, { recursive: true, force: true });
