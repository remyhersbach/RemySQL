#!/usr/bin/env node
// Renders the database icon from logo.png (left portion, no text) → assets/icon-dock.png
const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const { writeFileSync, unlinkSync } = require('node:fs');

// Force 1:1 pixel ratio so capturePage dimensions match CSS dimensions exactly
app.commandLine.appendSwitch('force-device-scale-factor', '1');

const SIZE = 1024;
// logo.png is 930×430; the database icon (cylinder + connectors, no text) is ~340px wide
// Scale the image so those 340px fill SIZE; overflow:hidden cuts off the text on the right
// logo.png is 930×430; database icon (no text) fits in the left ~370px
const CROP_W = 350;
const LOGO_W = 930;
const LOGO_H = 430;
const scaledW = Math.round(SIZE * LOGO_W / CROP_W);
const scaledH = Math.round(SIZE * LOGO_H / CROP_W);
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
  const topOffset = -Math.round((scaledH - SIZE) / 2);

  writeFileSync(htmlPath, `<!doctype html>
<html style="background:transparent;margin:0;padding:0">
<body style="margin:0;padding:0;width:${SIZE}px;height:${SIZE}px;overflow:hidden;background:transparent;position:relative">
<img src="logo.png"
     style="position:absolute;width:${scaledW}px;height:${scaledH}px;left:${leftShift}px;top:${topOffset}px;"
/>
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
