#!/usr/bin/env node
// Renders the database mark from logo.png into a macOS Big Sur-style app tile.
const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const { writeFileSync, unlinkSync } = require('node:fs');

// Force 1:1 pixel ratio so capturePage dimensions match CSS dimensions exactly
app.commandLine.appendSwitch('force-device-scale-factor', '1');

const SIZE = 1024;
// logo.png is 930×430; the database mark (cylinder + connectors, no text) is
// in the left ~350px. Keep it smaller inside the tile so it feels lighter in
// the Dock than the previous full-canvas crop.
const CROP_W = 350;
const LOGO_W = 930;
const LOGO_H = 430;
const MARK_W = 710;
const scaledW = Math.round(MARK_W * LOGO_W / CROP_W);
const scaledH = Math.round(MARK_W * LOGO_H / CROP_W);
const leftShift = 0;

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: SIZE,
    height: SIZE,
    show: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: { offscreen: true }
  });

  const htmlPath = path.join(__dirname, '..', 'assets', '_tmp_dock.html');
  const tileInset = 78;
  const tileSize = SIZE - tileInset * 2;
  const tileRadius = 218;
  const topOffset = -Math.round((scaledH - MARK_W) / 2);

  writeFileSync(htmlPath, `<!doctype html>
<html style="background:transparent;margin:0;padding:0">
<head>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      width: ${SIZE}px;
      height: ${SIZE}px;
      overflow: hidden;
      background: transparent;
      position: relative;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .tile {
      position: absolute;
      left: ${tileInset}px;
      top: ${tileInset}px;
      width: ${tileSize}px;
      height: ${tileSize}px;
      border-radius: ${tileRadius}px;
      overflow: hidden;
      background:
        radial-gradient(circle at 31% 18%, rgba(255,255,255,1) 0 18%, rgba(255,255,255,0.78) 36%, rgba(255,255,255,0) 60%),
        linear-gradient(145deg, #ffffff 0%, #fbfdff 52%, #f3faff 100%);
      box-shadow:
        0 24px 46px rgba(9, 30, 55, 0.14),
        0 8px 18px rgba(9, 30, 55, 0.08),
        inset 0 2px 0 rgba(255,255,255,0.86),
        inset 0 -14px 28px rgba(35, 82, 118, 0.035);
    }
    .tile::before {
      content: "";
      position: absolute;
      inset: 16px 18px auto 18px;
      height: 45%;
      border-radius: ${tileRadius - 34}px ${tileRadius - 34}px 120px 120px;
      background: linear-gradient(180deg, rgba(255,255,255,0.62), rgba(255,255,255,0));
      pointer-events: none;
    }
    .tile::after {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: inherit;
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.68),
        inset 0 0 0 2px rgba(22, 78, 116, 0.04);
      pointer-events: none;
    }
    .mark-shadow {
      position: absolute;
      left: 50%;
      top: 52%;
      width: ${MARK_W}px;
      height: ${MARK_W}px;
      transform: translate(-50%, -50%);
      border-radius: 64px;
      filter: drop-shadow(0 24px 28px rgba(24, 61, 86, 0.26)) drop-shadow(0 5px 8px rgba(22, 98, 139, 0.20));
    }
    .mark {
      position: absolute;
      inset: 0;
      overflow: hidden;
    }
    .mark img {
      position: absolute;
      width: ${scaledW}px;
      height: ${scaledH}px;
      left: ${leftShift}px;
      top: ${topOffset}px;
      display: block;
      filter: brightness(0.965) contrast(1.075) saturate(1.02);
    }
  </style>
</head>
<body>
  <div class="tile">
    <div class="mark-shadow">
      <div class="mark">
        <img src="logo.png" alt="">
      </div>
    </div>
  </div>
</body></html>`);

  await win.loadFile(htmlPath);
  await new Promise(r => setTimeout(r, 800));

  let image = await win.webContents.capturePage({ x: 0, y: 0, width: SIZE, height: SIZE });
  const sz = image.getSize();
  if (sz.width !== SIZE || sz.height !== SIZE) {
    image = image.resize({ width: SIZE, height: SIZE, quality: 'best' });
  }
  writeFileSync(path.join(__dirname, '..', 'assets', 'icon-dock.png'), image.toPNG());
  unlinkSync(htmlPath);
  console.log(`icon-dock.png gegenereerd: ${image.getSize().width}×${image.getSize().height}`);
  app.quit();
});
