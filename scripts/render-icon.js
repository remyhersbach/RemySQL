#!/usr/bin/env node
// Renders assets/icon.svg → assets/icon.png via Electron's Chromium engine.
// Run with: electron scripts/render-icon.js
const { app, BrowserWindow, nativeImage } = require('electron');
const path = require('node:path');
const { readFileSync, writeFileSync } = require('node:fs');

const SIZE = 1024;

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: SIZE,
    height: SIZE,
    show: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: { offscreen: true }
  });

  // Force the SVG to fill the full canvas regardless of its width/height attributes
  let svg = readFileSync(path.join(__dirname, '..', 'assets', 'icon.svg'), 'utf8');
  svg = svg.replace(/<svg([^>]*)>/, `<svg$1 style="width:${SIZE}px;height:${SIZE}px;display:block">`);

  const html = `<!doctype html>
<html style="background:transparent;margin:0;padding:0">
<body style="margin:0;padding:0;overflow:hidden;background:transparent;width:${SIZE}px;height:${SIZE}px">
${svg}
</body></html>`;

  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  await new Promise(r => setTimeout(r, 500));

  let image = await win.webContents.capturePage({ x: 0, y: 0, width: SIZE, height: SIZE });
  // Retina renders at 2×; resize back to SIZE×SIZE
  const { width, height } = image.getSize();
  if (width !== SIZE || height !== SIZE) {
    image = image.resize({ width: SIZE, height: SIZE, quality: 'best' });
  }
  writeFileSync(path.join(__dirname, '..', 'assets', 'icon.png'), image.toPNG());
  console.log(`icon.png gegenereerd: ${image.getSize().width}×${image.getSize().height}`);
  app.quit();
});
